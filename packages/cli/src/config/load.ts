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

// Env vars are strings; the schema expects real booleans/numbers, so these two
// convert before validation. An unparseable value is a user error worth failing on,
// not something to silently coerce to false/NaN.
function parseBooleanEnv(raw: string): boolean {
    const value = raw.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(value)) return true;
    if (["0", "false", "no", "off", ""].includes(value)) return false;
    throw new Error(
        `Invalid boolean value for SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT: "${raw}". Use 1/0, true/false, yes/no, or on/off.`,
    );
}

function parseIntegerEnv(name: string, raw: string): number {
    const value = Number(raw.trim());
    if (!Number.isInteger(value)) {
        throw new Error(`Invalid integer value for ${name}: "${raw}".`);
    }
    return value;
}

function readEnvOverrides(): Partial<SamuraizerConfig> {
    const env: Partial<SamuraizerConfig> = {};
    if (process.env.SAMURAIZER_MODEL) env.model = process.env.SAMURAIZER_MODEL;
    if (process.env.SAMURAIZER_OLLAMA_BASE_URL) env.ollamaBaseUrl = process.env.SAMURAIZER_OLLAMA_BASE_URL;
    if (process.env.SAMURAIZER_WHISPER_COMMAND) env.whisperCommand = process.env.SAMURAIZER_WHISPER_COMMAND;
    if (process.env.SAMURAIZER_WHISPER_MODEL_PATH) env.whisperModelPath = process.env.SAMURAIZER_WHISPER_MODEL_PATH;
    if (process.env.SAMURAIZER_WHISPER_DEVICE !== undefined) env.whisperDevice = process.env.SAMURAIZER_WHISPER_DEVICE;
    if (process.env.SAMURAIZER_WHISPER_PROMPT) env.whisperPrompt = process.env.SAMURAIZER_WHISPER_PROMPT;
    if (process.env.SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT !== undefined) {
        env.whisperCarryInitialPrompt = parseBooleanEnv(process.env.SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT);
    }
    if (process.env.SAMURAIZER_LLM_CONCURRENCY) {
        env.llmConcurrency = parseIntegerEnv("SAMURAIZER_LLM_CONCURRENCY", process.env.SAMURAIZER_LLM_CONCURRENCY);
    }
    if (process.env.SAMURAIZER_LANGUAGE) env.language = process.env.SAMURAIZER_LANGUAGE;
    if (process.env.SAMURAIZER_FFMPEG_COMMAND) env.ffmpegCommand = process.env.SAMURAIZER_FFMPEG_COMMAND;
    if (process.env.SAMURAIZER_FFPROBE_COMMAND) env.ffprobeCommand = process.env.SAMURAIZER_FFPROBE_COMMAND;
    if (process.env.SAMURAIZER_MEETINGS_DIR) env.meetingsDir = process.env.SAMURAIZER_MEETINGS_DIR;
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
