import { runCommand } from "../lib/run-command.js";

export async function ensureFfprobe(command: string): Promise<void> {
    try {
        await runCommand(command, ["-version"]);
    } catch {
        throw new Error(`ffprobe is not installed or not in PATH (tried '${command}'). Please install ffprobe.`);
    }
}
