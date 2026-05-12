import type { SamuraizerConfig } from "./types.js";

export const configTemplate: SamuraizerConfig = {
    model: "qwen2.5:14b",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    whisperCommand: "whisper-cli",
    whisperModelPath: "/absolute/path/to/ggml-model.bin",
    meetingsDir: "/absolute/path/to/your/samuraizer-meetings",
    language: "auto",
    ffmpegCommand: "ffmpeg",
    ffprobeCommand: "ffprobe",
};
