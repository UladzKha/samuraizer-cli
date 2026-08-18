import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Config surface tests: what `samuraizer init` actually writes to disk, and how
 * the loader merges file + env.
 *
 * The config path is mocked rather than driven through HOME/XDG_CONFIG_HOME,
 * because getUserConfigDir branches on process.platform and would otherwise
 * make these tests pass only on Linux.
 */

const state = vi.hoisted(() => ({ configDir: "", configFilePath: "" }));

vi.mock("./paths.js", () => ({
    getConfigDir: () => state.configDir,
    getConfigFilePath: () => state.configFilePath,
}));

const { initConfig } = await import("./init.js");
const { loadConfig } = await import("./load.js");
const { configSchema } = await import("./schema.js");
const { configTemplate } = await import("./template.js");

const ENV_KEYS = [
    "SAMURAIZER_MODEL",
    "SAMURAIZER_OLLAMA_BASE_URL",
    "SAMURAIZER_WHISPER_COMMAND",
    "SAMURAIZER_WHISPER_MODEL_PATH",
    "SAMURAIZER_WHISPER_DEVICE",
    "SAMURAIZER_WHISPER_PROMPT",
    "SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT",
    "SAMURAIZER_LANGUAGE",
    "SAMURAIZER_FFMPEG_COMMAND",
    "SAMURAIZER_FFPROBE_COMMAND",
    "SAMURAIZER_MEETINGS_DIR",
    "SAMURAIZER_LLM_CONCURRENCY",
];

let workDir: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "samuraizer-config-"));
    state.configDir = path.join(workDir, "samuraizer");
    state.configFilePath = path.join(state.configDir, "config.json");

    savedEnv = {};
    for (const key of ENV_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
    }
});

afterEach(async () => {
    for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    await rm(workDir, { recursive: true, force: true });
});

/** Write a config file directly, bypassing the template. */
async function writeConfig(config: Record<string, unknown>): Promise<void> {
    await mkdir(state.configDir, { recursive: true });
    await writeFile(state.configFilePath, JSON.stringify(config, null, 2), "utf-8");
}

const MINIMAL_CONFIG = {
    model: "qwen2.5:14b",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    whisperCommand: "whisper-cli",
    whisperModelPath: "/models/ggml.bin",
    meetingsDir: "/tmp/meetings",
    language: "auto",
    ffmpegCommand: "ffmpeg",
    ffprobeCommand: "ffprobe",
};

describe("initConfig", () => {
    it("writes a config a user can discover the optional fields from", async () => {
        const result = await initConfig();
        expect(result.created).toBe(true);

        // JSON.stringify drops comments, so every discoverable option must be a real key.
        const written = JSON.parse(await readFile(result.path, "utf-8"));
        for (const key of ["whisperDevice", "whisperPrompt", "whisperCarryInitialPrompt", "llmConcurrency"]) {
            expect(Object.keys(written)).toContain(key);
        }
    });

    it("writes defaults that are inert — the generated config changes no behavior", async () => {
        await initConfig();
        const written = JSON.parse(await readFile(state.configFilePath, "utf-8"));

        expect(written.whisperPrompt).toBe("");
        expect(written.whisperDevice).toBe("");
        expect(written.whisperCarryInitialPrompt).toBe(false);
        expect(written.llmConcurrency).toBe(3);
    });

    it("writes a config that validates against the schema", async () => {
        await initConfig();
        const written = JSON.parse(await readFile(state.configFilePath, "utf-8"));
        expect(() => configSchema.parse(written)).not.toThrow();
    });

    it("keeps the template and the schema in sync", () => {
        expect(() => configSchema.parse(configTemplate)).not.toThrow();
    });

    it("does not overwrite an existing config", async () => {
        await writeConfig({ ...MINIMAL_CONFIG, model: "user-picked-model" });
        const result = await initConfig();

        expect(result.created).toBe(false);
        const onDisk = JSON.parse(await readFile(state.configFilePath, "utf-8"));
        expect(onDisk.model).toBe("user-picked-model");
    });
});

describe("loadConfig — defaults and back-compat", () => {
    it("loads a pre-0.4.3 config that has none of the new fields", async () => {
        await writeConfig(MINIMAL_CONFIG);
        const config = await loadConfig();

        expect(config.llmConcurrency).toBe(3);
        expect(config.whisperPrompt).toBeUndefined();
        expect(config.whisperCarryInitialPrompt).toBeUndefined();
    });

    it("round-trips the generated config unchanged", async () => {
        await initConfig();
        const config = await loadConfig();

        expect(config.whisperPrompt).toBe("");
        expect(config.whisperCarryInitialPrompt).toBe(false);
        expect(config.llmConcurrency).toBe(3);
    });

    it("rejects an out-of-range llmConcurrency from the config file", async () => {
        await writeConfig({ ...MINIMAL_CONFIG, llmConcurrency: 9 });
        await expect(loadConfig()).rejects.toThrow();
    });

    it("rejects a fractional llmConcurrency", async () => {
        await writeConfig({ ...MINIMAL_CONFIG, llmConcurrency: 1.5 });
        await expect(loadConfig()).rejects.toThrow();
    });
});

describe("loadConfig — env overrides", () => {
    beforeEach(async () => {
        await writeConfig(MINIMAL_CONFIG);
    });

    it("overrides whisperPrompt", async () => {
        process.env.SAMURAIZER_WHISPER_PROMPT = "Patient ID, CR";
        expect((await loadConfig()).whisperPrompt).toBe("Patient ID, CR");
    });

    it.each([
        ["1", true],
        ["true", true],
        ["TRUE", true],
        ["yes", true],
        ["on", true],
        ["0", false],
        ["false", false],
        ["no", false],
        ["off", false],
        ["", false],
    ])("parses SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT=%j as %s", async (raw, expected) => {
        process.env.SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT = raw;
        expect((await loadConfig()).whisperCarryInitialPrompt).toBe(expected);
    });

    it("fails loudly on a non-boolean carry value instead of silently reading it as false", async () => {
        process.env.SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT = "maybe";
        await expect(loadConfig()).rejects.toThrow(/Invalid boolean value/);
    });

    it("overrides llmConcurrency with an integer", async () => {
        process.env.SAMURAIZER_LLM_CONCURRENCY = "1";
        expect((await loadConfig()).llmConcurrency).toBe(1);
    });

    it("fails loudly on a non-numeric llmConcurrency", async () => {
        process.env.SAMURAIZER_LLM_CONCURRENCY = "lots";
        await expect(loadConfig()).rejects.toThrow(/Invalid integer value/);
    });

    it("fails on an out-of-range llmConcurrency from env", async () => {
        process.env.SAMURAIZER_LLM_CONCURRENCY = "9";
        await expect(loadConfig()).rejects.toThrow();
    });

    it("lets whisperDevice 0 through — it is valid despite being falsy", async () => {
        process.env.SAMURAIZER_WHISPER_DEVICE = "0";
        expect((await loadConfig()).whisperDevice).toBe("0");
    });

    it("leaves unset fields to the config file", async () => {
        process.env.SAMURAIZER_LLM_CONCURRENCY = "2";
        const config = await loadConfig();
        expect(config.llmConcurrency).toBe(2);
        expect(config.model).toBe(MINIMAL_CONFIG.model);
    });
});
