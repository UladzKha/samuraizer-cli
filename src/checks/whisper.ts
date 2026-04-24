import { runCommand } from "../lib/run-command.js";

export async function ensureWhisperCli(command: string): Promise<void> {
    try {
        await runCommand(command, ["-h"]);
    } catch {
        throw new Error(`whisper-cli is not installed or not in PATH (tried '${command}'). Please install whisper-cli.`);
    }
}
