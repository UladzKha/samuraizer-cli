import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * whisper.cpp is faked here: the point of these tests is what the tool does
 * around the call, not the transcription itself.
 */
vi.mock("../../pipeline/transcription/transcribe.js", () => ({
    transcribeWithWhisper: vi.fn(async ({ audioPath }: { audioPath: string }) => ({
        text: "hello",
        segments: [{ startSec: 0, endSec: 1, text: "hello" }],
        sourceAudioPath: audioPath,
        language: "en",
    })),
}));

const { transcribeAudioTool } = await import("./transcribe-audio-tool.js");
const { runTool } = await import("../../shared/tool-definition.js");

let workDir: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "samuraizer-transcribe-tool-"));
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
});

describe("transcribeAudioTool", () => {
    it("creates a missing run directory, since whisper-cli will not and exits 0 anyway", async () => {
        const runDir = path.join(workDir, "not-created-yet", "nested");

        const result = await runTool(transcribeAudioTool, {
            audioPath: path.join(workDir, "audio.wav"),
            runDir,
            modelPath: "/models/ggml.bin",
            language: "en",
            whisperCommand: "whisper-cli",
        });

        expect((await stat(runDir)).isDirectory()).toBe(true);
        expect(result.transcriptPath).toBe(path.join(runDir, "transcript.txt"));
    });

    it("removes the directory it created when transcription fails", async () => {
        const { transcribeWithWhisper } = await import("../../pipeline/transcription/transcribe.js");
        vi.mocked(transcribeWithWhisper).mockRejectedValueOnce(new Error("whisper exploded"));

        const runDir = path.join(workDir, "doomed");

        await expect(
            runTool(transcribeAudioTool, {
                audioPath: path.join(workDir, "audio.wav"),
                runDir,
                modelPath: "/models/ggml.bin",
                language: "en",
                whisperCommand: "whisper-cli",
            }),
        ).rejects.toThrow("whisper exploded");

        await expect(stat(runDir)).rejects.toMatchObject({ code: "ENOENT" });
    });

    it("keeps a pre-existing directory even when transcription fails", async () => {
        const { transcribeWithWhisper } = await import("../../pipeline/transcription/transcribe.js");
        vi.mocked(transcribeWithWhisper).mockRejectedValueOnce(new Error("whisper exploded"));

        // workDir already exists and is not ours to delete.
        await expect(
            runTool(transcribeAudioTool, {
                audioPath: path.join(workDir, "audio.wav"),
                runDir: workDir,
                modelPath: "/models/ggml.bin",
                language: "en",
                whisperCommand: "whisper-cli",
            }),
        ).rejects.toThrow("whisper exploded");

        expect((await stat(workDir)).isDirectory()).toBe(true);
    });

    it("is happy when the run directory already exists", async () => {
        const result = await runTool(transcribeAudioTool, {
            audioPath: path.join(workDir, "audio.wav"),
            runDir: workDir,
            modelPath: "/models/ggml.bin",
            language: "en",
            whisperCommand: "whisper-cli",
        });

        expect(result.text).toBe("hello");
    });
});
