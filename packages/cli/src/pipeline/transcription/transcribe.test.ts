import { describe, it, expect } from "vitest";
import { buildWhisperEnvOverride } from "./transcribe.js";

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
