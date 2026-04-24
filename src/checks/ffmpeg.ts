import { runCommand } from "../lib/run-command.js";

export async function ensureFfmpeg(command: string): Promise<void> {
    try {
        await runCommand(command, ["-version"]);
    } catch {
        throw new Error(`ffmpeg is not installed or not in PATH (tried '${command}'). Please install ffmpeg.`);
    }
}
