import { z } from "zod";

export const configSchema = z.object({
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
    whisperCommand: z.string().min(1),
    whisperModelPath: z.string().min(1),
    language: z.string().min(1),
    ffmpegCommand: z.string().min(1),
    ffprobeCommand: z.string().min(1),
    outputDir: z.string().min(1).optional(),
});

export const partialConfigSchema = configSchema.partial();
