import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Integration test for the orchestrator.
 *
 * External commands (ffmpeg, ffprobe, whisper-cli) and Ollama are faked at the
 * tool-registry boundary, but the *schemas* of those tools are the real ones —
 * so a wrong field name in a tool input still fails here. Everything the
 * orchestrator itself does (caching, fan-out, meta status, report,
 * meeting.json + memnex-spec validation) runs for real against a temp dir.
 */

const state = vi.hoisted(() => ({
    /** Every meta.status persisted during a run, in order. */
    statuses: [] as string[],
    /** Inputs the transcribe tool was called with. */
    transcribeInputs: [] as Record<string, unknown>[],
    /** LLM stage lifecycle, used to reason about concurrency. */
    llmCalls: [] as string[],
    llmInFlight: 0,
    llmPeak: 0,
    /** Stage name that should throw when it runs. */
    failStage: null as string | null,
    /** Delay each fake LLM stage takes, ms. */
    llmDelayMs: 10,
}));

vi.mock("../checks/ffmpeg.js", () => ({ ensureFfmpeg: vi.fn(async () => {}) }));
vi.mock("../checks/ffprobe.js", () => ({ ensureFfprobe: vi.fn(async () => {}) }));
vi.mock("../checks/whisper.js", () => ({ ensureWhisperCli: vi.fn(async () => {}) }));
vi.mock("../checks/ollama.js", () => ({ ensureOllama: vi.fn(async () => {}) }));

vi.mock("../lib/version-detection.js", () => ({
    detectWhisperCppVersion: vi.fn(async () => "whisper.cpp v1.7.4"),
    detectOllamaVersion: vi.fn(async () => "0.5.0"),
}));

vi.mock("../pipeline/audio/probe.js", () => ({
    probeAudio: vi.fn(async (filePath: string) => ({
        filePath,
        formatName: "wav",
        durationSec: 12.5,
        sizeBytes: 4096,
        sampleRate: 16000,
        channels: 1,
        codecName: "pcm_s16le",
    })),
}));

// Record every persisted status, then delegate to the real writer.
vi.mock("../pipeline/output/save.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../pipeline/output/save.js")>();
    return {
        ...actual,
        saveMeta: async (paths: Parameters<typeof actual.saveMeta>[0], meta: Parameters<typeof actual.saveMeta>[1]) => {
            state.statuses.push(meta.status);
            return actual.saveMeta(paths, meta);
        },
    };
});

// Keep the real tool definitions (and therefore the real zod schemas), swap only execute().
vi.mock("../shared/tool-registry.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../shared/tool-registry.js")>();

    const llmStage = <T>(name: string, result: T) => async () => {
        state.llmCalls.push(`${name}:start`);
        state.llmInFlight++;
        state.llmPeak = Math.max(state.llmPeak, state.llmInFlight);
        await new Promise((resolve) => setTimeout(resolve, state.llmDelayMs));
        state.llmInFlight--;
        if (state.failStage === name) {
            state.llmCalls.push(`${name}:throw`);
            throw new Error(`${name} stage failed`);
        }
        state.llmCalls.push(`${name}:end`);
        return result;
    };

    return {
        ...actual,
        tools: {
            ...actual.tools,
            normalize_audio: {
                ...actual.tools.normalize_audio,
                execute: async (input: { outputPath: string }) => ({ normalizedAudioPath: input.outputPath }),
            },
            transcribe_audio: {
                ...actual.tools.transcribe_audio,
                execute: async (input: Record<string, unknown>) => {
                    state.transcribeInputs.push(input);
                    return {
                        text: "Anna: ship the exporter.\nBoris: agreed.",
                        segments: [
                            { startSec: 0, endSec: 2.5, text: "Anna: ship the exporter." },
                            { startSec: 2.5, endSec: 4, text: "Boris: agreed." },
                        ],
                        transcriptPath: path.join(input.runDir as string, "transcript.txt"),
                        sourceAudioPath: input.audioPath as string,
                        language: "en",
                    };
                },
            },
            summarize_transcript: {
                ...actual.tools.summarize_transcript,
                execute: llmStage("summary", { summary: "The team agreed to ship the exporter." }),
            },
            extract_action_items: {
                ...actual.tools.extract_action_items,
                execute: llmStage("actions", {
                    items: [{ text: "Ship the exporter", owner: "Boris", dueDate: "Friday" }],
                }),
            },
            extract_decisions: {
                ...actual.tools.extract_decisions,
                execute: llmStage("decisions", { items: [{ text: "Ship the exporter this week" }] }),
            },
        },
    };
});

const { processMeeting } = await import("./process-meeting.js");
type ProcessMeetingInput = Parameters<typeof processMeeting>[0];

let workDir: string;
let inputPath: string;
let meetingsDir: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "samuraizer-orchestrator-"));
    meetingsDir = path.join(workDir, "meetings");
    await mkdir(meetingsDir, { recursive: true });
    inputPath = path.join(workDir, "standup.wav");
    await writeFile(inputPath, "not really audio, only hashed", "utf-8");

    state.statuses = [];
    state.transcribeInputs = [];
    state.llmCalls = [];
    state.llmInFlight = 0;
    state.llmPeak = 0;
    state.failStage = null;
    state.llmDelayMs = 10;

    vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
    vi.restoreAllMocks();
    await rm(workDir, { recursive: true, force: true });
});

function makeInput(overrides: Partial<ProcessMeetingInput> = {}): ProcessMeetingInput {
    return {
        inputPath,
        meetingsDir,
        model: "test-model",
        ollamaBaseUrl: "http://127.0.0.1:11434",
        whisperCommand: "whisper-cli",
        whisperModelPath: "/models/ggml.bin",
        language: "en",
        ffmpegCommand: "ffmpeg",
        ffprobeCommand: "ffprobe",
        ...overrides,
    };
}

async function readJson(filePath: string): Promise<any> {
    return JSON.parse(await readFile(filePath, "utf-8"));
}

describe("processMeeting — pipeline status (meta.json)", () => {
    it("persists only statuses the pipeline can actually produce", async () => {
        const { paths } = await processMeeting(makeInput());

        expect(state.statuses).toEqual([
            "audio_normalized",
            "transcribed",
            "decisions_extracted",
            "report_generated",
            "meeting_output_generated",
        ]);
        // The three LLM stages complete as one step; the old per-stage values are gone.
        expect(state.statuses).not.toContain("summarized");
        expect(state.statuses).not.toContain("action_items_extracted");

        const meta = await readJson(paths.metaFilePath);
        expect(meta.status).toBe("meeting_output_generated");
    });

    it("leaves the status at 'transcribed' when an LLM stage fails mid-run", async () => {
        state.failStage = "decisions";
        const input = makeInput();

        await expect(processMeeting(input)).rejects.toThrow("decisions stage failed");

        const runDir = path.join(meetingsDir, "standup");
        const meta = await readJson(path.join(runDir, "meta.json"));
        expect(meta.status).toBe("transcribed");
        // No claim of summary/action-item progress in meta, even though...
        expect(meta.summary).toBeUndefined();
        expect(meta.actionItems).toBeUndefined();
    });

    it("still leaves completed artifacts on disk after a failure, so a re-run resumes", async () => {
        state.failStage = "decisions";
        await expect(processMeeting(makeInput())).rejects.toThrow();

        const runDir = path.join(meetingsDir, "standup");
        expect(await readJson(path.join(runDir, "summary.json"))).toHaveProperty("summary");

        // Second run: summary is cached, only the previously failing stage re-runs.
        state.failStage = null;
        state.llmCalls = [];
        await processMeeting(makeInput());

        expect(state.llmCalls).not.toContain("summary:start");
        expect(state.llmCalls).toContain("decisions:start");
    });
});

describe("processMeeting — writes a spec-valid meeting.json", () => {
    it("produces all artifacts and a memnex-spec 0.2.0 document", async () => {
        const { paths } = await processMeeting(makeInput());

        const meeting = await readJson(paths.meetingJsonPath);
        expect(meeting.schema_version).toBe("0.2.0");
        expect(meeting.summary.text).toBe("The team agreed to ship the exporter.");
        expect(meeting.action_items).toHaveLength(1);
        expect(meeting.decisions).toHaveLength(1);
        expect(meeting.transcript.language).toBe("en");

        for (const artifact of [paths.summaryJsonPath, paths.actionItemsJsonPath, paths.decisionsJsonPath, paths.reportMarkdownPath]) {
            await expect(readFile(artifact, "utf-8")).resolves.toBeTruthy();
        }
    });

    it("stamps every LLM artifact with the same createdAt", async () => {
        const { paths } = await processMeeting(makeInput());
        const [summary, actions, decisions] = await Promise.all([
            readJson(paths.summaryJsonPath),
            readJson(paths.actionItemsJsonPath),
            readJson(paths.decisionsJsonPath),
        ]);
        expect(actions.createdAt).toBe(summary.createdAt);
        expect(decisions.createdAt).toBe(summary.createdAt);
    });
});

describe("processMeeting — llmConcurrency", () => {
    it("runs all three stages at once by default", async () => {
        await processMeeting(makeInput());
        expect(state.llmPeak).toBe(3);
    });

    it("runs one stage at a time at llmConcurrency 1", async () => {
        await processMeeting(makeInput({ llmConcurrency: 1 }));
        expect(state.llmPeak).toBe(1);
        expect(state.llmCalls).toEqual([
            "summary:start",
            "summary:end",
            "actions:start",
            "actions:end",
            "decisions:start",
            "decisions:end",
        ]);
    });

    it("caps in-flight stages at 2 when asked", async () => {
        await processMeeting(makeInput({ llmConcurrency: 2 }));
        expect(state.llmPeak).toBe(2);
    });

    it("does not start the remaining stage after a failure at concurrency 1", async () => {
        state.failStage = "actions";
        await expect(processMeeting(makeInput({ llmConcurrency: 1 }))).rejects.toThrow("actions stage failed");
        expect(state.llmCalls).toContain("summary:end");
        expect(state.llmCalls).not.toContain("decisions:start");
    });

    it("produces identical artifacts whether stages run concurrently or serially", async () => {
        const concurrent = await processMeeting(makeInput());
        const concurrentSummary = await readJson(concurrent.paths.summaryJsonPath);

        await rm(meetingsDir, { recursive: true, force: true });
        await mkdir(meetingsDir, { recursive: true });

        const serial = await processMeeting(makeInput({ llmConcurrency: 1 }));
        const serialSummary = await readJson(serial.paths.summaryJsonPath);

        expect(serialSummary.summary).toBe(concurrentSummary.summary);
        expect(serialSummary.model).toBe(concurrentSummary.model);
    });
});

describe("processMeeting — caching", () => {
    it("skips LLM stages when their artifacts already exist", async () => {
        await processMeeting(makeInput());
        state.llmCalls = [];

        await processMeeting(makeInput());

        expect(state.llmCalls).toEqual([]);
        expect(state.statuses).toContain("meeting_output_generated");
    });

    it("recomputes everything with force", async () => {
        await processMeeting(makeInput());
        state.llmCalls = [];

        await processMeeting(makeInput({ force: true }));

        expect(state.llmCalls).toContain("summary:start");
        expect(state.llmCalls).toContain("actions:start");
        expect(state.llmCalls).toContain("decisions:start");
    });
});

describe("processMeeting — whisper prompt passthrough", () => {
    it("passes no prompt fields when whisperPrompt is unset", async () => {
        await processMeeting(makeInput());
        const [transcribeInput] = state.transcribeInputs;
        expect(transcribeInput).not.toHaveProperty("initialPrompt");
        expect(transcribeInput).not.toHaveProperty("carryInitialPrompt");
    });

    it("passes the prompt through when set", async () => {
        await processMeeting(makeInput({ whisperPrompt: "Patient ID, CR" }));
        expect(state.transcribeInputs[0]).toMatchObject({ initialPrompt: "Patient ID, CR" });
        expect(state.transcribeInputs[0]).not.toHaveProperty("carryInitialPrompt");
    });

    it("passes carryInitialPrompt alongside the prompt", async () => {
        await processMeeting(makeInput({ whisperPrompt: "Patient ID", whisperCarryInitialPrompt: true }));
        expect(state.transcribeInputs[0]).toMatchObject({
            initialPrompt: "Patient ID",
            carryInitialPrompt: true,
        });
    });

    it("drops a whitespace-only prompt, and carry with it", async () => {
        await processMeeting(makeInput({ whisperPrompt: "   ", whisperCarryInitialPrompt: true }));
        const [transcribeInput] = state.transcribeInputs;
        expect(transcribeInput).not.toHaveProperty("initialPrompt");
        expect(transcribeInput).not.toHaveProperty("carryInitialPrompt");
    });

    it("passes whisperDevice independently of the prompt", async () => {
        await processMeeting(makeInput({ whisperDevice: 0 }));
        expect(state.transcribeInputs[0]).toMatchObject({ whisperDevice: 0 });
    });
});

describe("processMeeting — undecodable input", () => {
    it("leaves no run directory behind when the source cannot be probed", async () => {
        const { probeAudio } = await import("../pipeline/audio/probe.js");
        vi.mocked(probeAudio).mockRejectedValueOnce(new Error("Failed to probe audio metadata."));

        await expect(processMeeting(makeInput())).rejects.toThrow("Failed to probe audio metadata.");

        // The run directory is named after the input's base name. A file with a
        // valid audio extension that ffprobe rejects must not leave an orphan
        // directory and meta.json for list_meetings to trip over later.
        await expect(stat(path.join(meetingsDir, "standup"))).rejects.toMatchObject({ code: "ENOENT" });
    });
});
