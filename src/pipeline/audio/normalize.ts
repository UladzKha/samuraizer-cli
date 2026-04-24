import { runCommand } from "../../lib/run-command.js";

export type NormalizeAudioInput = {
    inputPath: string;
    outputPath: string;
    ffmpegCommand: string;
};

export async function normalizeAudio({ inputPath, outputPath, ffmpegCommand }: NormalizeAudioInput): Promise<void> {
    const args = ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", outputPath];

    try {
        await runCommand(ffmpegCommand, args);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ffmpeg error";
        throw new Error(`Failed to normalize audio: ${message}`);
    }
}
