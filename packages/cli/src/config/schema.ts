import { z } from "zod";
import os from "node:os";
import path from "node:path";

export const configSchema = z.object({
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
    whisperCommand: z.string().min(1),
    whisperModelPath: z.string().min(1),
    language: z.string().min(1),
    ffmpegCommand: z.string().min(1),
    ffprobeCommand: z.string().min(1),
    meetingsDir: z.string().min(1).default(path.join(os.homedir(), ".samuraizer", "meetings")),
});

export const partialConfigSchema = configSchema.partial();
