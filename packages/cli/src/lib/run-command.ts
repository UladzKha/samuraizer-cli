import { execa } from "execa";

export type CommandResult = {
    stdout: string;
    stderr: string;
};

export async function runCommand(
    command: string,
    args: string[],
    env?: Record<string, string>,
): Promise<CommandResult> {
    const result = await execa(command, args, env !== undefined ? { reject: true, env } : { reject: true });

    return {
        stdout: result.stdout,
        stderr: result.stderr,
    };
}
