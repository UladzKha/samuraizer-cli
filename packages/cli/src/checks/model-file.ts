import { access } from "node:fs/promises";
import { configTemplate } from "../config/template.js";

export async function checkWhisperModelFile(modelPath: string): Promise<{ ok: boolean; message: string }> {
    if (modelPath === configTemplate.whisperModelPath) {
        return {
            ok: false,
            message: `whisperModelPath is still the placeholder value. Set it to a downloaded Whisper model (e.g. ggml-large-v3.bin).`,
        };
    }

    try {
        await access(modelPath);
        return { ok: true, message: `Whisper model found at ${modelPath}` };
    } catch {
        return { ok: false, message: `whisperModelPath does not exist: ${modelPath}` };
    }
}
