import { access, readFile } from "node:fs/promises";
import { getConfigFilePath } from "./paths.js";
import { configSchema, partialConfigSchema } from "./schema.js";
import type { SamuraizerConfig } from "./types.js";

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readConfigFile(filePath: string): Promise<Partial<SamuraizerConfig>> {
    const raw = await readFile(filePath, "utf-8");

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(
            `Invalid config file at ${filePath}. Please fix the JSON or run 'samuraizer init' to recreate it.`,
        );
    }

    const result = partialConfigSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Config file at ${filePath} is invalid: ${result.error.message}`);
    }
    return result.data;
}

function readEnvOverrides(): Partial<SamuraizerConfig> {
    const env: Partial<SamuraizerConfig> = {};
    if (process.env.SAMURAIZER_MODEL) env.model = process.env.SAMURAIZER_MODEL;
    if (process.env.SAMURAIZER_OLLAMA_BASE_URL) env.ollamaBaseUrl = process.env.SAMURAIZER_OLLAMA_BASE_URL;
    if (process.env.SAMURAIZER_WHISPER_COMMAND) env.whisperCommand = process.env.SAMURAIZER_WHISPER_COMMAND;
    if (process.env.SAMURAIZER_WHISPER_MODEL_PATH) env.whisperModelPath = process.env.SAMURAIZER_WHISPER_MODEL_PATH;
    if (process.env.SAMURAIZER_LANGUAGE) env.language = process.env.SAMURAIZER_LANGUAGE;
    if (process.env.SAMURAIZER_FFMPEG_COMMAND) env.ffmpegCommand = process.env.SAMURAIZER_FFMPEG_COMMAND;
    if (process.env.SAMURAIZER_FFPROBE_COMMAND) env.ffprobeCommand = process.env.SAMURAIZER_FFPROBE_COMMAND;
    if (process.env.SAMURAIZER_OUTPUT_DIR) env.outputDir = process.env.SAMURAIZER_OUTPUT_DIR;
    return env;
}

export async function loadConfig(): Promise<SamuraizerConfig> {
    const filePath = getConfigFilePath();
    if (!(await fileExists(filePath))) {
        throw new Error(
            `The config file is not created, please run 'samuraizer init' to create it. Expected at: ${filePath}`,
        );
    }
    const fileConfig = await readConfigFile(filePath);
    const envConfig = readEnvOverrides();
    const merged = { ...fileConfig, ...envConfig };
    return configSchema.parse(merged);
}
