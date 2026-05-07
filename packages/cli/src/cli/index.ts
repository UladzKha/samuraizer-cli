#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { initConfig } from "../config/init.js";
import { loadConfig } from "../config/load.js";
import { getConfigFilePath } from "../config/paths.js";
import { processMeeting } from "../orchestrators/process-meeting.js";
import { runTool } from "../shared/tool-definition.js";
import { tools } from "../shared/tool-registry.js";
import { startMcpServer } from "../mcp/server.js";

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

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
                outputRootDir: config.outputDir,
                model: config.model,
                ollamaBaseUrl: config.ollamaBaseUrl,
                whisperCommand: config.whisperCommand,
                whisperModelPath: config.whisperModelPath,
                language: config.language,
                ffmpegCommand: config.ffmpegCommand,
                ffprobeCommand: config.ffprobeCommand,
                force: options.force,
            });

            console.log("\nDone.");
            console.log(`Output dir:   ${result.paths.runDir}`);
            console.log(`Transcript:   ${result.paths.transcriptTextPath}`);
            console.log(`Summary:      ${result.paths.summaryTextPath}`);
            console.log(`Action items: ${result.paths.actionItemsTextPath}`);
            console.log(`Decisions:    ${result.paths.decisionsTextPath}`);
            console.log(`Report:       ${result.paths.reportMarkdownPath}`);
            console.log(`Meta:         ${result.paths.metaFilePath}`);

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
            const text = await readFile(file, "utf-8");
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
            const text = await readFile(file, "utf-8");
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
            const text = await readFile(file, "utf-8");
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

program
    .command("init")
    .description("Create the Samuraizer config file with default values")
    .action(async () => {
        try {
            const result = await initConfig();
            if (result.created) {
                console.log(`Created config at: ${result.path}`);
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

program
    .command("mcp")
    .description("Start the MCP server (stdio transport)")
    .action(async () => {
        try {
            await startMcpServer();
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
        }
    });

program.parse(process.argv);
