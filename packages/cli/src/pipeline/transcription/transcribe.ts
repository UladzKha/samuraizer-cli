import { readFile, writeFile } from "node:fs/promises";
import { runCommand } from "../../lib/run-command.js";
import type { Transcript, TranscriptSegment } from "./types.js";

export type TranscribeWithWhisperInput = {
    audioPath: string;
    outputPrefix: string;  // path prefix without extension, e.g. "output/meeting/transcript"
    modelPath: string;
    language: string;
    whisperCommand: string;
    whisperDevice?: number | string;
};

// Returns only the vars to *add* to the env; execa's extendEnv:true merges them with process.env.
// Uses explicit !== checks because whisperDevice of 0 is valid but falsy — if (whisperDevice) would skip it.
export function buildWhisperEnvOverride(whisperDevice: number | string | undefined): Record<string, string> {
    if (whisperDevice !== undefined && whisperDevice !== null && whisperDevice !== "") {
        return { CUDA_VISIBLE_DEVICES: String(whisperDevice) };
    }
    return {};
}

export async function transcribeWithWhisper({
    audioPath,
    outputPrefix,
    modelPath,
    language,
    whisperCommand,
    whisperDevice,
}: TranscribeWithWhisperInput): Promise<Transcript> {
    const args = [
        "-m", modelPath,
         "-f", audioPath,
          "-oj", "-of", outputPrefix,
           "-l", language,
           "-sns", "-mc", "0", "-et", "2.6"
        ];

    const envOverride = buildWhisperEnvOverride(whisperDevice);
    const hasOverride = Object.keys(envOverride).length > 0;

    try {
        await runCommand(whisperCommand, args, hasOverride ? envOverride : undefined);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown whisper-cli error";
        throw new Error(`Failed to transcribe audio.\n${message}`);
    }

    const jsonPath = `${outputPrefix}.json`;

    let rawJson: string;
    try {
        rawJson = await readFile(jsonPath, "utf-8");
    } catch {
        throw new Error(`whisper-cli finished but JSON output was not found: ${jsonPath}`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJson);
    } catch (parseError) {
        throw new Error(`Failed to parse whisper-cli JSON output: ${jsonPath}\n${parseError}`);
    }

    if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("transcription" in parsed) ||
        !Array.isArray((parsed as Record<string, unknown>).transcription)
    ) {
        throw new Error(
            `whisper-cli JSON has invalid shape (missing or non-array \`transcription\` field): ${jsonPath}`,
        );
    }

    const result = (parsed as Record<string, unknown>).result;
    let detectedLanguage: string | undefined;
    if (
        typeof result === "object" &&
        result !== null &&
        "language" in result &&
        typeof (result as Record<string, unknown>).language === "string"
    ) {
        const lang = ((result as Record<string, unknown>).language as string).trim();
        if (lang.length > 0) {
            detectedLanguage = lang.toLowerCase();
        }
    }

    const rawSegments = (parsed as Record<string, unknown>).transcription as unknown[];

    if (rawSegments.length === 0) {
        throw new Error(`whisper-cli returned no transcription segments for: ${audioPath}`);
    }

    const segments: TranscriptSegment[] = rawSegments.map((seg, i) => {
        if (
            typeof seg !== "object" ||
            seg === null ||
            !("offsets" in seg) ||
            !("text" in seg) ||
            typeof (seg as Record<string, unknown>).text !== "string"
        ) {
            throw new Error(`whisper-cli JSON segment has invalid shape at index ${i}: ${jsonPath}`);
        }

        const offsets = (seg as Record<string, unknown>).offsets;
        if (
            typeof offsets !== "object" ||
            offsets === null ||
            typeof (offsets as Record<string, unknown>).from !== "number" ||
            typeof (offsets as Record<string, unknown>).to !== "number"
        ) {
            throw new Error(`whisper-cli JSON segment has invalid shape at index ${i}: ${jsonPath}`);
        }

        const { from, to } = offsets as { from: number; to: number };
        return {
            startSec: from / 1000,
            endSec: to / 1000,
            text: ((seg as Record<string, unknown>).text as string).trim(),
        };
    });

    const text = segments.map((s) => s.text).join("\n");
    const txtPath = `${outputPrefix}.txt`;
    await writeFile(txtPath, text, "utf-8");

    return {
        text,
        segments,
        sourceAudioPath: audioPath,
        language: detectedLanguage,
    };
}
