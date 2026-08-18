import type { SamuraizerConfig } from "./types.js";

// NOTE: `samuraizer init` writes this object with JSON.stringify, so comments in
// this file never reach the user's config. Anything a user should be able to
// discover must be a real field with a harmless default — an empty string for
// whisperPrompt/whisperDevice means "unset" everywhere downstream.
export const configTemplate: SamuraizerConfig = {
    model: "qwen2.5:14b",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    whisperCommand: "whisper-cli",
    whisperModelPath: "/absolute/path/to/ggml-model.bin",
    // Device whisper-cli runs on: index (0, 1), list ("0,1"), or GPU UUID. "" = default device.
    whisperDevice: "",
    // Hotwords / domain terms to bias Whisper decoding toward.
    // e.g. "Patient ID, CR, Change Request, Spider, Grant"
    whisperPrompt: "",
    // Re-apply whisperPrompt to every decoding window, not just the first.
    whisperCarryInitialPrompt: false,
    meetingsDir: "/absolute/path/to/your/samuraizer-meetings",
    language: "auto",
    ffmpegCommand: "ffmpeg",
    ffprobeCommand: "ffprobe",
    // Concurrent LLM stages (1-3). Lower this if Ollama runs out of VRAM.
    llmConcurrency: 3,
};
