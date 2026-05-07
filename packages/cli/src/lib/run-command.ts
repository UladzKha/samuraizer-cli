import { execa } from "execa";

export type CommandResult = {
    stdout: string;
    stderr: string;
};

export async function runCommand(command: string, args: string[]): Promise<CommandResult> {
    const result = await execa(command, args, { reject: true });

    return {
        stdout: result.stdout,
        stderr: result.stderr,
    };
}
