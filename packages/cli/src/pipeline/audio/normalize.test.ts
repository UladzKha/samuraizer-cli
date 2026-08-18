import { describe, it, expect } from "vitest";
import path from "node:path";
import { normalizeAudio } from "./normalize.js";

describe("normalizeAudio", () => {
    it("reports a missing input file without spawning ffmpeg", async () => {
        const missing = "/definitely/not/here.m4a";

        await expect(
            normalizeAudio({
                inputPath: missing,
                outputPath: "/tmp/samuraizer-should-not-be-written.wav",
                // If the existence check were skipped and ffmpeg were spawned, the
                // rejection would be about this missing binary instead of the input.
                ffmpegCommand: "samuraizer-ffmpeg-that-does-not-exist",
            }),
        ).rejects.toThrow(`File does not exist: ${path.resolve(missing)}`);
    });
});
