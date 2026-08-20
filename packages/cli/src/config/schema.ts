import { z } from "zod";
import os from "node:os";
import path from "node:path";

export const configSchema = z.object({
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
    whisperCommand: z.string().min(1),
    whisperModelPath: z.string().min(1),
    // Value semantics match CUDA_VISIBLE_DEVICES: device index (0, 1), comma list ("0,1"), or GPU UUID
    whisperDevice: z.union([z.number(), z.string()]).optional(),
    // Whisper initial prompt: hotwords, domain terms, names to bias decoding toward.
    // Maps to whisper-cli --prompt. Max ~n_text_ctx/2 tokens; keep under ~200 chars.
    whisperPrompt: z.string().optional(),
    // whisper.cpp feeds the initial prompt to the first window only — after that it is
    // pushed out by accumulated context, so hotwords stop biasing a long recording.
    // Setting this maps to --carry-initial-prompt, which re-prepends it to every window.
    whisperCarryInitialPrompt: z.boolean().optional(),
    language: z.string().min(1),
    ffmpegCommand: z.string().min(1),
    ffprobeCommand: z.string().min(1),
    meetingsDir: z.string().min(1).default(path.join(os.homedir(), ".samuraizer", "meetings")),
    // How many LLM stages (summary, action items, decisions) run concurrently.
    // Each in-flight request makes Ollama reserve another num_ctx-sized KV cache slot,
    // so parallel execution is opt-in; 1 is the safe default for all hardware.
    llmConcurrency: z.number().int().min(1).max(3).default(1),
});

export const partialConfigSchema = configSchema.partial();
