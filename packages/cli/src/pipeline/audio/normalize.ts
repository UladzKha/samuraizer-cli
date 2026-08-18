import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { runCommand } from "../../lib/run-command.js";

export type NormalizeAudioInput = {
    inputPath: string;
    outputPath: string;
    ffmpegCommand: string;
};

export async function normalizeAudio({ inputPath, outputPath, ffmpegCommand }: NormalizeAudioInput): Promise<void> {
    // A missing input is the common case, and ffmpeg reports it only after its
    // banner. Check first so the caller gets the same clear message the full
    // pipeline's validateInputFile produces.
    try {
        await access(inputPath, constants.F_OK);
    } catch {
        throw new Error(`File does not exist: ${path.resolve(inputPath)}`);
    }

    // -v error suppresses the version/configuration banner, matching probeAudio,
    // so a genuine failure is not buried under ~25 lines of build flags.
    const args = ["-v", "error", "-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", outputPath];

    try {
        await runCommand(ffmpegCommand, args);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ffmpeg error";
        throw new Error(`Failed to normalize audio: ${message}`);
    }
}
