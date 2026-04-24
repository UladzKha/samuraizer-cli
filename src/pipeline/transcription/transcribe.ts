import { readFile, writeFile } from "node:fs/promises";
import { runCommand } from "../../lib/run-command.js";
import type { Transcript, TranscriptSegment } from "./types.js";

export type TranscribeWithWhisperInput = {
    audioPath: string;
    outputPrefix: string;  // path prefix without extension, e.g. "output/meeting/transcript"
    modelPath: string;
    language: string;
    whisperCommand: string;
};

export async function transcribeWithWhisper({
    audioPath,
    outputPrefix,
    modelPath,
    language,
    whisperCommand,
}: TranscribeWithWhisperInput): Promise<Transcript> {
    const args = ["-m", modelPath, "-f", audioPath, "-otxt", "-of", outputPrefix, "-nt", "-l", language];

    try {
        await runCommand(whisperCommand, args);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown whisper-cli error";
        throw new Error(`Failed to transcribe audio.\n${message}`);
    }

    const transcriptPath = `${outputPrefix}.txt`;

    let transcriptText: string;
    try {
        transcriptText = await readFile(transcriptPath, "utf-8");
    } catch {
        throw new Error(`whisper-cli finished but transcript file was not found: ${transcriptPath}`);
    }

    const cleanedText = transcriptText.trim();
    await writeFile(transcriptPath, cleanedText, "utf-8");

    return {
        text: cleanedText,
        segments: parseSegmentsFromPlainText(cleanedText),
        sourceAudioPath: audioPath,
    };
}

function parseSegmentsFromPlainText(text: string): TranscriptSegment[] {
    if (!text.trim()) return [];

    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({ startSec: index, endSec: index, text: line }));
}
