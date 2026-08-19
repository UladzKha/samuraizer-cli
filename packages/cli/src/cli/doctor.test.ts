import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
    config: undefined as Record<string, unknown> | undefined,
    nodeOk: true,
    ffmpegOk: true,
    ffprobeOk: true,
    whisperOk: true,
    ollamaOk: true,
    modelFileOk: true,
    meetingsDirOk: true,
    ollamaModelOk: true,
}));

vi.mock("../config/load.js", () => ({
    loadConfig: async () => {
        if (!state.config) throw new Error("Config file is not created");
        return state.config;
    },
}));

vi.mock("../config/paths.js", () => ({
    getConfigFilePath: () => "/fake/config.json",
}));

vi.mock("../checks/node-version.js", () => ({
    checkNodeVersion: () => (state.nodeOk ? { ok: true, message: "Node.js ok" } : { ok: false, message: "Node.js too old" }),
}));

vi.mock("../checks/ffmpeg.js", () => ({
    ensureFfmpeg: async () => {
        if (!state.ffmpegOk) throw new Error("ffmpeg missing");
    },
}));

vi.mock("../checks/ffprobe.js", () => ({
    ensureFfprobe: async () => {
        if (!state.ffprobeOk) throw new Error("ffprobe missing");
    },
}));

vi.mock("../checks/whisper.js", () => ({
    ensureWhisperCli: async () => {
        if (!state.whisperOk) throw new Error("whisper-cli missing");
    },
}));

vi.mock("../checks/ollama.js", () => ({
    ensureOllama: async () => {
        if (!state.ollamaOk) throw new Error("ollama unreachable");
    },
    checkOllamaModel: async () =>
        state.ollamaModelOk ? { ok: true, message: "model available" } : { ok: false, message: "model missing" },
}));

vi.mock("../checks/model-file.js", () => ({
    checkWhisperModelFile: async () =>
        state.modelFileOk ? { ok: true, message: "model file found" } : { ok: false, message: "model file missing" },
}));

vi.mock("../checks/meetings-dir.js", () => ({
    checkMeetingsDir: async () =>
        state.meetingsDirOk ? { ok: true, message: "meetings dir ok" } : { ok: false, message: "meetings dir not writable" },
}));

const { runDoctor } = await import("./doctor.js");

beforeEach(() => {
    state.config = undefined;
    state.nodeOk = true;
    state.ffmpegOk = true;
    state.ffprobeOk = true;
    state.whisperOk = true;
    state.ollamaOk = true;
    state.modelFileOk = true;
    state.meetingsDirOk = true;
    state.ollamaModelOk = true;
});

describe("runDoctor", () => {
    it("reports ok when every environment check passes and no config exists yet", async () => {
        const report = await runDoctor();
        expect(report.environment.every((c) => c.ok)).toBe(true);
        expect(report.config).toHaveLength(1);
        expect(report.config[0]?.ok).toBe(false);
        expect(report.config[0]?.message).toContain("samuraizer init");
        expect(report.ok).toBe(false);
    });

    it("runs config-dependent checks once a config file exists", async () => {
        state.config = {
            model: "qwen2.5:14b",
            ollamaBaseUrl: "http://127.0.0.1:11434",
            whisperCommand: "whisper-cli",
            whisperModelPath: "/models/ggml.bin",
            meetingsDir: "/tmp/meetings",
            ffmpegCommand: "ffmpeg",
            ffprobeCommand: "ffprobe",
        };

        const report = await runDoctor();
        expect(report.config).toHaveLength(3);
        expect(report.ok).toBe(true);
    });

    it("is not ok when any single check fails", async () => {
        state.whisperOk = false;
        const report = await runDoctor();
        expect(report.ok).toBe(false);
        expect(report.environment.some((c) => !c.ok)).toBe(true);
    });
});
