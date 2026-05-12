/**
 * Best-effort version detection for external pipeline tools.
 *
 * Returns null on any failure (tool not installed, version flag not supported,
 * unparsable output). Callers should treat this as informational provenance
 * data, not as a precondition for processing.
 */

import { runCommand } from "./run-command.js";

/**
 * Detect whisper.cpp version by running the binary with --help and parsing
 * the version line. whisper.cpp prints a build identifier in the help text
 * but does not support --version directly on all builds.
 */
export async function detectWhisperCppVersion(whisperCommand: string): Promise<string | null> {
    try {
        const result = await runCommand(whisperCommand, ["--help"]);
        const combined = `${result.stdout}\n${result.stderr}`;
        const versionMatch = combined.match(/whisper\.cpp\s+version[:\s]+([\d.]+\S*)/i);
        if (versionMatch) return versionMatch[1];
        const buildMatch = combined.match(/build[:\s]+(\d+)/i);
        if (buildMatch) return `build-${buildMatch[1]}`;
        return null;
    } catch {
        return null;
    }
}

/**
 * Detect ollama version via `ollama --version`. The CLI prints a single
 * line like "ollama version is 0.1.30".
 */
export async function detectOllamaVersion(): Promise<string | null> {
    try {
        const result = await runCommand("ollama", ["--version"]);
        const combined = `${result.stdout}\n${result.stderr}`;
        const match = combined.match(/version\s+is\s+([\d.]+\S*)/i) ?? combined.match(/([\d.]+\S*)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}
