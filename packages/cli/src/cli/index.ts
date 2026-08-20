#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { initConfig } from "../config/init.js";
import { loadConfig } from "../config/load.js";
import { getConfigFilePath } from "../config/paths.js";
import { processMeeting } from "../orchestrators/process-meeting.js";
import { runTool } from "../shared/tool-definition.js";
import { tools } from "../shared/tool-registry.js";
import { runDoctor, type DoctorCheck } from "./doctor.js";

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

/**
 * Read a transcript for the summarize/actions/decisions commands.
 *
 * A bare readFile surfaces Node's raw "ENOENT: no such file or directory, open
 * '...'", which reads like a crash rather than a mistyped path. Translate the
 * two errors a user actually hits into the same wording `process` uses.
 */
async function readTranscriptFile(file: string): Promise<string> {
    try {
        return await readFile(file, "utf-8");
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            throw new Error(`Transcript file does not exist: ${resolve(file)}`);
        }
        if (code === "EISDIR") {
            throw new Error(`Path is a directory, not a transcript file: ${resolve(file)}`);
        }
        throw error;
    }
}

const program = new Command();

program
    .name("samuraizer")
    .description("Transform meeting recordings into structured knowledge")
    .version(pkg.version);

program
    .command("process")
    .description("Run the full pipeline on an audio recording")
    .argument("<input>", "Path to the audio recording")
    .option("-v, --verbose", "Show detailed output after processing")
    .option("-f, --force", "Recompute all steps even if outputs already exist")
    .action(async (
        input: string,
        options: {
            verbose?: boolean;
            force?: boolean;
        },
    ) => {
        try {
            const config = await loadConfig();

            console.log(`Input:      ${input}`);
            console.log(`Model:      ${config.model}`);
            console.log(`Ollama URL: ${config.ollamaBaseUrl}`);

            const result = await processMeeting({
                inputPath: input,
                meetingsDir: config.meetingsDir,
                model: config.model,
                ollamaBaseUrl: config.ollamaBaseUrl,
                whisperCommand: config.whisperCommand,
                whisperModelPath: config.whisperModelPath,
                ...(config.whisperDevice !== undefined && { whisperDevice: config.whisperDevice }),
                ...(config.whisperPrompt !== undefined && { whisperPrompt: config.whisperPrompt }),
                ...(config.whisperCarryInitialPrompt !== undefined && { whisperCarryInitialPrompt: config.whisperCarryInitialPrompt }),
                language: config.language,
                ffmpegCommand: config.ffmpegCommand,
                ffprobeCommand: config.ffprobeCommand,
                llmConcurrency: config.llmConcurrency,
                force: options.force,
                onProgress: (message) => console.log(message),
            });

            console.log("\nDone.");
            console.log(`All files saved to: ${result.paths.runDir}`);

            if (options.verbose) {
                console.log("\nMeta:", JSON.stringify(result.meta, null, 2));
            }
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program
    .command("normalize")
    .description("Normalize audio to Whisper-compatible WAV format")
    .argument("<input>", "Input audio file")
    .argument("<output>", "Output WAV file path")
    .action(async (input: string, output: string) => {
        try {
            const config = await loadConfig();
            const result = await runTool(tools.normalize_audio, {
                inputPath: input,
                outputPath: output,
                ffmpegCommand: config.ffmpegCommand,
            });
            console.log(`Normalized: ${result.normalizedAudioPath}`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program
    .command("summarize")
    .description("Summarize a transcript file")
    .argument("<file>", "Path to the transcript text file")
    .action(async (file: string) => {
        try {
            const config = await loadConfig();
            const text = await readTranscriptFile(file);
            const result = await runTool(tools.summarize_transcript, {
                transcriptText: text,
                model: config.model,
                ollamaBaseUrl: config.ollamaBaseUrl,
            });
            console.log(result.summary);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program
    .command("actions")
    .description("Extract action items from a transcript file")
    .argument("<file>", "Path to the transcript text file")
    .action(async (file: string) => {
        try {
            const config = await loadConfig();
            const text = await readTranscriptFile(file);
            const result = await runTool(tools.extract_action_items, {
                transcriptText: text,
                model: config.model,
                ollamaBaseUrl: config.ollamaBaseUrl,
            });
            console.log(JSON.stringify(result, null, 2));
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program
    .command("decisions")
    .description("Extract decisions from a transcript file")
    .argument("<file>", "Path to the transcript text file")
    .action(async (file: string) => {
        try {
            const config = await loadConfig();
            const text = await readTranscriptFile(file);
            const result = await runTool(tools.extract_decisions, {
                transcriptText: text,
                model: config.model,
                ollamaBaseUrl: config.ollamaBaseUrl,
            });
            console.log(JSON.stringify(result, null, 2));
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

function printDoctorGroup(title: string, checks: DoctorCheck[]): void {
    console.log(title);
    for (const check of checks) {
        console.log(`  ${check.ok ? "✓" : "✗"} ${check.message}`);
    }
}

program
    .command("doctor")
    .description("Check that Node, ffmpeg, whisper-cli, and Ollama are set up correctly")
    .action(async () => {
        const report = await runDoctor();

        printDoctorGroup("Environment", report.environment);
        console.log("");
        printDoctorGroup("Config", report.config);

        console.log("");
        if (report.ok) {
            console.log("All checks passed. You're ready to run 'samuraizer process'.");
        } else {
            console.log("Some checks failed — fix the ✗ items above, then run 'samuraizer doctor' again.");
            process.exitCode = 1;
        }
    });

program
    .command("init")
    .description("Create the Samuraizer config file with default values")
    .action(async () => {
        try {
            const result = await initConfig();
            if (result.created) {
                console.log(`Created config at: ${result.path}`);
                console.log("Set whisperModelPath and meetingsDir before running 'samuraizer process'.");
                console.log(
                    "Optional fields (whisperDevice, whisperPrompt, whisperCarryInitialPrompt, llmConcurrency) are documented in the README.",
                );
            } else {
                console.log(`Config already exists at: ${result.path}`);
                console.log("No changes were made. Edit the file manually to update values.");
            }
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

const configCommand = program.command("config").description("Inspect Samuraizer configuration");

configCommand
    .command("path")
    .description("Print the absolute path to the config file")
    .action(() => {
        console.log(getConfigFilePath());
    });

configCommand
    .command("get")
    .description("Print the resolved configuration (file + env) as JSON")
    .action(async () => {
        try {
            const config = await loadConfig();
            console.log(JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program.parse(process.argv);
