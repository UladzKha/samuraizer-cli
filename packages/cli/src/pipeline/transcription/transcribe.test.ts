import { describe, it, expect } from "vitest";
import { buildPromptArgs, buildWhisperEnvOverride } from "./transcribe.js";

describe("buildWhisperEnvOverride", () => {
    it("returns empty object when whisperDevice is undefined (no CUDA_VISIBLE_DEVICES added)", () => {
        expect(buildWhisperEnvOverride(undefined)).toEqual({});
    });

    it("sets CUDA_VISIBLE_DEVICES for device 0 — must not skip because 0 is falsy", () => {
        expect(buildWhisperEnvOverride(0)).toEqual({ CUDA_VISIBLE_DEVICES: "0" });
    });

    it("sets CUDA_VISIBLE_DEVICES for device 1", () => {
        expect(buildWhisperEnvOverride(1)).toEqual({ CUDA_VISIBLE_DEVICES: "1" });
    });

    it("forwards GPU UUID strings verbatim", () => {
        expect(buildWhisperEnvOverride("GPU-abc123")).toEqual({ CUDA_VISIBLE_DEVICES: "GPU-abc123" });
    });

    it("returns empty object when whisperDevice is empty string", () => {
        expect(buildWhisperEnvOverride("")).toEqual({});
    });
});

describe("buildPromptArgs", () => {
    it("emits nothing when no prompt is set", () => {
        expect(buildPromptArgs(undefined, undefined)).toEqual([]);
        expect(buildPromptArgs(undefined, true)).toEqual([]);
    });

    it("emits nothing for a blank prompt — including when carry is requested", () => {
        expect(buildPromptArgs("   ", undefined)).toEqual([]);
        expect(buildPromptArgs("   ", true)).toEqual([]);
    });

    it("passes a trimmed prompt as a single argv entry (no shell quoting needed)", () => {
        expect(buildPromptArgs("  Patient ID, CR  ", undefined)).toEqual(["--prompt", "Patient ID, CR"]);
    });

    it("adds --carry-initial-prompt only when carry is enabled", () => {
        expect(buildPromptArgs("Patient ID", false)).toEqual(["--prompt", "Patient ID"]);
        expect(buildPromptArgs("Patient ID", true)).toEqual(["--prompt", "Patient ID", "--carry-initial-prompt"]);
    });
});
