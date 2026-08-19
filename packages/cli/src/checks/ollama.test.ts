import { describe, it, expect, afterEach, vi } from "vitest";
import { checkOllamaModel } from "./ollama.js";

afterEach(() => {
    vi.unstubAllGlobals();
});

function stubTags(models: { name: string }[]): void {
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: true, json: async () => ({ models }) }) as unknown as Response),
    );
}

describe("checkOllamaModel", () => {
    it("passes on an exact name match", async () => {
        stubTags([{ name: "qwen2.5:14b" }]);
        const result = await checkOllamaModel("http://127.0.0.1:11434", "qwen2.5:14b");
        expect(result.ok).toBe(true);
    });

    it("matches a bare model name against Ollama's implicit :latest tag", async () => {
        stubTags([{ name: "qwen2.5:latest" }]);
        const result = await checkOllamaModel("http://127.0.0.1:11434", "qwen2.5");
        expect(result.ok).toBe(true);
    });

    it("fails when the model is not in the pulled list", async () => {
        stubTags([{ name: "llama3:8b" }]);
        const result = await checkOllamaModel("http://127.0.0.1:11434", "qwen2.5:14b");
        expect(result.ok).toBe(false);
        expect(result.message).toContain("ollama pull qwen2.5:14b");
    });

    it("fails when Ollama is unreachable", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("connect ECONNREFUSED");
            }),
        );
        const result = await checkOllamaModel("http://127.0.0.1:11434", "qwen2.5:14b");
        expect(result.ok).toBe(false);
    });
});
