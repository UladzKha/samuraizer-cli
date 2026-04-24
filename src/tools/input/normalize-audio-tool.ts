import { z } from "zod";
import { ToolDefinition } from "../../shared/tool-definition.js";
import { normalizeAudio } from "../../pipeline/audio/normalize.js";

const inputSchema = z.object({
    inputPath: z.string().min(1),
    outputPath: z.string().min(1),
    ffmpegCommand: z.string().min(1),
});

const outputSchema = z.object({
    normalizedAudioPath: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

export const normalizeAudioTool: ToolDefinition<Input, Output> = {
    name: "normalize_audio",
    description: "Normalize audio to 16kHz mono PCM WAV for Whisper",
    inputSchema,
    outputSchema,
    async execute(input) {
        await normalizeAudio({
            inputPath: input.inputPath,
            outputPath: input.outputPath,
            ffmpegCommand: input.ffmpegCommand,
        });
        return { normalizedAudioPath: input.outputPath };
    },
};
