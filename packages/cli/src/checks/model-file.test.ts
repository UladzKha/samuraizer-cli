import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkWhisperModelFile } from "./model-file.js";
import { configTemplate } from "../config/template.js";

let workDir: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "samuraizer-model-file-"));
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
});

describe("checkWhisperModelFile", () => {
    it("fails on the unedited template placeholder", async () => {
        const result = await checkWhisperModelFile(configTemplate.whisperModelPath);
        expect(result.ok).toBe(false);
        expect(result.message).toContain("placeholder");
    });

    it("fails when the configured path does not exist", async () => {
        const result = await checkWhisperModelFile(path.join(workDir, "missing.bin"));
        expect(result.ok).toBe(false);
        expect(result.message).toContain("does not exist");
    });

    it("passes when the model file exists", async () => {
        const modelPath = path.join(workDir, "ggml-model.bin");
        await writeFile(modelPath, "");
        const result = await checkWhisperModelFile(modelPath);
        expect(result.ok).toBe(true);
    });
});
