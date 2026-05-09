import { readFileSync } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "@samuraizer/schema";
import { buildMeetingOutput } from "../pipeline/output/build-meeting-output.js";
import { sha256File } from "../lib/sha256-file.js";
import { ensureFfmpeg } from "../checks/ffmpeg.js";
import { ensureFfprobe } from "../checks/ffprobe.js";
import { ensureOllama } from "../checks/ollama.js";
import { ensureWhisperCli } from "../checks/whisper.js";
import { probeAudio } from "../pipeline/audio/probe.js";
import { validateInputFile } from "../pipeline/audio/validate-input.js";
import { prepareOutput, type RunMeta } from "../pipeline/output/prepare.js";
import { saveMeta } from "../pipeline/output/save.js";
import { type OutputPaths } from "../pipeline/output/paths.js";
import { generateReport } from "../pipeline/report/generate.js";
import { runTool } from "../shared/tool-definition.js";
import { tools } from "../shared/tool-registry.js";
import type { TranscriptSegment } from "../pipeline/transcription/types.js";

export type ProcessMeetingInput = {
    inputPath: string;
    outputRootDir?: string;
    model: string;
    ollamaBaseUrl: string;
    whisperCommand: string;
    whisperModelPath: string;
    language: string;
    ffmpegCommand: string;
    ffprobeCommand: string;
    force?: boolean;
};

export type ProcessMeetingResult = {
    paths: OutputPaths;
    meta: RunMeta;
};

function readPackageVersion(): string {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
        readFileSync(path.join(here, "../../package.json"), "utf-8"),
    ) as { version: string };
    return pkg.version;
}

export async function processMeeting(input: ProcessMeetingInput): Promise<ProcessMeetingResult> {
    const validatedFile = await validateInputFile(input.inputPath);
    const outputRootDir = input.outputRootDir ?? path.dirname(validatedFile.resolvedPath);
    const { paths, meta } = await prepareOutput(validatedFile, outputRootDir);

    await ensureFfmpeg(input.ffmpegCommand);
    await ensureFfprobe(input.ffprobeCommand);
    await ensureWhisperCli(input.whisperCommand);
    await ensureOllama(input.ollamaBaseUrl);

    // Probe source audio
    meta.input.audioMetadata = await probeAudio(validatedFile.resolvedPath, input.ffprobeCommand);

    // Normalize audio
    let normalized: { normalizedAudioPath: string };
    if (!input.force && await fileExists(paths.normalizedAudioPath)) {
        console.log("Skipping normalization (cached).");
        normalized = { normalizedAudioPath: paths.normalizedAudioPath };
    } else {
        console.log("Normalizing audio...");
        normalized = await runTool(tools.normalize_audio, {
            inputPath: validatedFile.resolvedPath,
            outputPath: paths.normalizedAudioPath,
            ffmpegCommand: input.ffmpegCommand,
        });
    }
    meta.output.normalizedAudioPath = normalized.normalizedAudioPath;
    meta.output.normalizedAudioMetadata = await probeAudio(normalized.normalizedAudioPath, input.ffprobeCommand);
    meta.status = "audio_normalized";
    await saveMeta(paths, meta);

    // Transcribe
    let transcription: { text: string; segments: TranscriptSegment[]; sourceAudioPath: string; transcriptPath: string; language?: string };
    if (!input.force && await fileExists(paths.transcriptJsonPath)) {
        console.log("Skipping transcription (cached).");
        const cached = await readJson<{ text: string; segments: TranscriptSegment[]; sourceAudioPath: string; language?: string }>(paths.transcriptJsonPath);
        transcription = { ...cached, transcriptPath: paths.transcriptTextPath };
    } else {
        console.log("Transcribing audio...");
        transcription = await runTool(tools.transcribe_audio, {
            audioPath: normalized.normalizedAudioPath,
            runDir: paths.runDir,
            modelPath: input.whisperModelPath,
            language: input.language,
            whisperCommand: input.whisperCommand,
        });
        await writeFile(
            paths.transcriptJsonPath,
            JSON.stringify(
                {
                    text: transcription.text,
                    segments: transcription.segments,
                    sourceAudioPath: transcription.sourceAudioPath,
                    language: transcription.language,
                },
                null,
                2,
            ),
            "utf-8",
        );
    }
    meta.output.transcriptTextPath = transcription.transcriptPath;
    meta.output.transcriptJsonPath = paths.transcriptJsonPath;
    meta.transcription = {
        engine: "whisper.cpp",
        modelPath: input.whisperModelPath,
        textLength: transcription.text.length,
    };
    meta.status = "transcribed";
    await saveMeta(paths, meta);

    // Summarize
    let summaryResult: { summary: string; model: string; sourceTranscriptPath: string; createdAt: string };
    if (!input.force && await fileExists(paths.summaryJsonPath)) {
        console.log("Skipping summary (cached).");
        summaryResult = await readJson(paths.summaryJsonPath);
    } else {
        console.log("Generating summary...");
        const { summary } = await runTool(tools.summarize_transcript, {
            transcriptText: transcription.text,
            model: input.model,
            ollamaBaseUrl: input.ollamaBaseUrl,
        });
        const createdAt = new Date().toISOString();
        summaryResult = { summary, model: input.model, sourceTranscriptPath: transcription.transcriptPath, createdAt };
        await writeFile(paths.summaryTextPath, summary, "utf-8");
        await writeFile(paths.summaryJsonPath, JSON.stringify(summaryResult, null, 2), "utf-8");
    }
    meta.output.summaryTextPath = paths.summaryTextPath;
    meta.output.summaryJsonPath = paths.summaryJsonPath;
    meta.summary = { model: input.model, textLength: summaryResult.summary.length };
    meta.status = "summarized";
    await saveMeta(paths, meta);

    // Extract action items
    let actionItemsResult: { items: Array<{ text: string; owner: string | null; dueDate: string | null }>; model: string; sourceTranscriptPath: string; createdAt: string };
    if (!input.force && await fileExists(paths.actionItemsJsonPath)) {
        console.log("Skipping action items (cached).");
        actionItemsResult = await readJson(paths.actionItemsJsonPath);
    } else {
        console.log("Extracting action items...");
        const { items: actionItems } = await runTool(tools.extract_action_items, {
            transcriptText: transcription.text,
            model: input.model,
            ollamaBaseUrl: input.ollamaBaseUrl,
        });
        actionItemsResult = { items: actionItems, model: input.model, sourceTranscriptPath: transcription.transcriptPath, createdAt: summaryResult.createdAt };
        await writeFile(paths.actionItemsTextPath, formatActionItems(actionItems), "utf-8");
        await writeFile(paths.actionItemsJsonPath, JSON.stringify(actionItemsResult, null, 2), "utf-8");
    }
    meta.output.actionItemsTextPath = paths.actionItemsTextPath;
    meta.output.actionItemsJsonPath = paths.actionItemsJsonPath;
    meta.actionItems = { model: input.model, count: actionItemsResult.items.length };
    meta.status = "action_items_extracted";
    await saveMeta(paths, meta);

    // Extract decisions
    let decisionsResult: { items: Array<{ text: string }>; model: string; sourceTranscriptPath: string; createdAt: string };
    if (!input.force && await fileExists(paths.decisionsJsonPath)) {
        console.log("Skipping decisions (cached).");
        decisionsResult = await readJson(paths.decisionsJsonPath);
    } else {
        console.log("Extracting decisions...");
        const { items: decisions } = await runTool(tools.extract_decisions, {
            transcriptText: transcription.text,
            model: input.model,
            ollamaBaseUrl: input.ollamaBaseUrl,
        });
        decisionsResult = { items: decisions, model: input.model, sourceTranscriptPath: transcription.transcriptPath, createdAt: summaryResult.createdAt };
        await writeFile(paths.decisionsTextPath, formatDecisions(decisions), "utf-8");
        await writeFile(paths.decisionsJsonPath, JSON.stringify(decisionsResult, null, 2), "utf-8");
    }
    meta.output.decisionsTextPath = paths.decisionsTextPath;
    meta.output.decisionsJsonPath = paths.decisionsJsonPath;
    meta.decisions = { model: input.model, count: decisionsResult.items.length };
    meta.status = "decisions_extracted";
    await saveMeta(paths, meta);

    // Generate report
    if (!input.force && await fileExists(paths.reportMarkdownPath)) {
        console.log("Skipping report (cached).");
    } else {
        console.log("Generating report...");
        await generateReport({
            reportPath: paths.reportMarkdownPath,
            meetingTitle: validatedFile.baseName,
            sourceFileName: validatedFile.fileName,
            transcript: {
                text: transcription.text,
                segments: transcription.segments,
                sourceAudioPath: transcription.sourceAudioPath,
            },
            summary: summaryResult,
            actionItems: actionItemsResult,
            decisions: decisionsResult,
        });
    }
    meta.output.reportMarkdownPath = paths.reportMarkdownPath;
    meta.report = { generated: true };
    meta.status = "report_generated";
    await saveMeta(paths, meta);

    // Generate meeting.json (schema-validated)
    console.log("Generating meeting.json...");

    const sourceSha256 = await sha256File(validatedFile.resolvedPath);
    const producerVersion = readPackageVersion();

    const meetingOutput = buildMeetingOutput({
        meta,
        transcript: {
            text: transcription.text,
            segments: transcription.segments,
            sourceAudioPath: transcription.sourceAudioPath,
            language: transcription.language,
        },
        summary: summaryResult,
        actionItems: actionItemsResult,
        decisions: decisionsResult,
        sourceSha256,
        producerVersion,
    });

    const validationResult = validate(meetingOutput);
    if (!validationResult.valid) {
        const errorLines = validationResult.errors
            .map((e) => `  ${e.path}: ${e.message} (${e.keyword})`)
            .join("\n");
        throw new Error(
            `Generated meeting.json fails schema validation. This is a bug in the mapper.\n${errorLines}`,
        );
    }

    await writeFile(paths.meetingJsonPath, JSON.stringify(validationResult.data, null, 2), "utf-8");
    meta.output.meetingJsonPath = paths.meetingJsonPath;
    meta.status = "meeting_output_generated";
    await saveMeta(paths, meta);

    return { paths, meta };
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readJson<T>(filePath: string): Promise<T> {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
}

function formatActionItems(
    items: Array<{ text: string; owner: string | null; dueDate: string | null }>,
): string {
    if (items.length === 0) return "No action items found.";
    return items
        .map((item) => {
            const details = [
                item.owner ? `owner: ${item.owner}` : null,
                item.dueDate ? `due: ${item.dueDate}` : null,
            ].filter(Boolean);
            return details.length > 0 ? `- ${item.text} — ${details.join(", ")}` : `- ${item.text}`;
        })
        .join("\n");
}

function formatDecisions(items: Array<{ text: string }>): string {
    if (items.length === 0) return "No decisions found.";
    return items.map((item) => `- ${item.text}`).join("\n");
}
