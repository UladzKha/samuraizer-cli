import { mkdir, writeFile } from "node:fs/promises";
import type { AudioMetadata } from "../audio/probe.js";
import type { ValidatedInputFile } from "../audio/validate-input.js";
import { buildOutputPaths, type OutputPaths } from "./paths.js";

export type RunMeta = {
    createdAt: string;
    input: {
        originalPath: string;
        resolvedPath: string;
        fileName: string;
        baseName: string;
        extension: string;
        audioMetadata?: AudioMetadata;
    };
    output: {
        runDir: string;
        normalizedAudioPath?: string;
        normalizedAudioMetadata?: AudioMetadata;
        transcriptTextPath?: string;
        transcriptJsonPath?: string;
        summaryTextPath?: string;
        summaryJsonPath?: string;
        actionItemsTextPath?: string;
        actionItemsJsonPath?: string;
        decisionsTextPath?: string;
        decisionsJsonPath?: string;
        reportMarkdownPath?: string;
        meetingJsonPath?: string;
    };
    transcription?: {
        engine: "whisper.cpp";
        modelPath: string;
        language?: string;
        textLength: number;
    };
    summary?: {
        model: string;
        textLength: number;
    };
    actionItems?: {
        model: string;
        count: number;
    };
    decisions?: {
        model: string;
        count: number;
    };
    report?: {
        generated: boolean;
    };
    status:
        | "initialized"
        | "audio_normalized"
        | "audio_probed"
        | "transcribed"
        | "summarized"
        | "action_items_extracted"
        | "decisions_extracted"
        | "report_generated"
        | "meeting_output_generated";
};

export type PreparedOutput = {
    paths: OutputPaths;
    meta: RunMeta;
};

export async function prepareOutput(inputFile: ValidatedInputFile, meetingsDir: string): Promise<PreparedOutput> {
    const paths = buildOutputPaths(inputFile, meetingsDir);

    await mkdir(paths.runDir, { recursive: true });

    const meta: RunMeta = {
        createdAt: new Date().toISOString(),
        input: {
            originalPath: inputFile.inputPath,
            resolvedPath: inputFile.resolvedPath,
            fileName: inputFile.fileName,
            baseName: inputFile.baseName,
            extension: inputFile.extension,
        },
        output: {
            runDir: paths.runDir,
        },
        status: "initialized",
    };

    await writeFile(paths.metaFilePath, JSON.stringify(meta, null, 2), "utf-8");

    return { paths, meta };
}
