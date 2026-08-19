import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkMeetingsDir } from "./meetings-dir.js";
import { configTemplate } from "../config/template.js";

let workDir: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), "samuraizer-meetings-dir-"));
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
});

describe("checkMeetingsDir", () => {
    it("fails on the unedited template placeholder", async () => {
        const result = await checkMeetingsDir(configTemplate.meetingsDir);
        expect(result.ok).toBe(false);
        expect(result.message).toContain("placeholder");
    });

    it("creates the directory and passes when it is writable", async () => {
        const dir = path.join(workDir, "nested", "meetings");
        const result = await checkMeetingsDir(dir);
        expect(result.ok).toBe(true);
    });
});
