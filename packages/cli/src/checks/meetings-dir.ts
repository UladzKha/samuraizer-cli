import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { configTemplate } from "../config/template.js";

export async function checkMeetingsDir(dir: string): Promise<{ ok: boolean; message: string }> {
    if (dir === configTemplate.meetingsDir) {
        return {
            ok: false,
            message: `meetingsDir is still the placeholder value. Set it to a real directory for Samuraizer's output.`,
        };
    }

    const probeFile = path.join(dir, ".samuraizer-doctor-probe");
    try {
        await mkdir(dir, { recursive: true });
        await writeFile(probeFile, "");
        await rm(probeFile);
        return { ok: true, message: `meetingsDir is writable: ${dir}` };
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { ok: false, message: `meetingsDir is not writable: ${dir} (${detail})` };
    }
}
