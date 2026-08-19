import { describe, it, expect, afterEach } from "vitest";
import { checkNodeVersion } from "./node-version.js";

const originalVersion = process.versions.node;

function setNodeVersion(version: string): void {
    Object.defineProperty(process.versions, "node", { value: version, configurable: true });
}

afterEach(() => {
    setNodeVersion(originalVersion);
});

describe("checkNodeVersion", () => {
    it("passes on the current runtime (>= 20 in CI)", () => {
        const result = checkNodeVersion();
        expect(result.ok).toBe(true);
    });

    it("passes at exactly the minimum supported major version", () => {
        setNodeVersion("20.0.0");
        expect(checkNodeVersion().ok).toBe(true);
    });

    it("fails below the minimum supported major version", () => {
        setNodeVersion("18.19.0");
        const result = checkNodeVersion();
        expect(result.ok).toBe(false);
        expect(result.message).toContain("18.19.0");
    });
});
