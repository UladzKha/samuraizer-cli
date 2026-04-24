import { runCommand } from "../../lib/run-command.js";

export type AudioMetadata = {
    filePath: string;
    formatName?: string;
    durationSec?: number;
    sizeBytes?: number;
    bitRate?: number;
    sampleRate?: number;
    channels?: number;
    codecName?: string;
};

type FfprobeJson = {
    format?: {
        format_name?: string;
        duration?: string;
        size?: string;
        bit_rate?: string;
    };
    streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        sample_rate?: string;
        channels?: number;
    }>;
};

export async function probeAudio(filePath: string, ffprobeCommand: string): Promise<AudioMetadata> {
    const args = ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath];

    let stdout: string;
    try {
        const result = await runCommand(ffprobeCommand, args);
        stdout = result.stdout;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ffprobe error";
        throw new Error(`Failed to probe audio metadata.\n${message}`);
    }

    let parsed: FfprobeJson;
    try {
        parsed = JSON.parse(stdout) as FfprobeJson;
    } catch {
        throw new Error("Failed to parse ffprobe JSON output.");
    }

    const audioStream = parsed.streams?.find((s) => s.codec_type === "audio");

    return {
        filePath,
        formatName: parsed.format?.format_name,
        durationSec: toNumber(parsed.format?.duration),
        sizeBytes: toNumber(parsed.format?.size),
        bitRate: toNumber(parsed.format?.bit_rate),
        sampleRate: toNumber(audioStream?.sample_rate),
        channels: audioStream?.channels,
        codecName: audioStream?.codec_name,
    };
}

function toNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
