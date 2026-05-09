import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createContext } from '../tools/context.js';
import { runTool } from '../shared/tool-definition.js';
import { tools } from '../shared/tool-registry.js';
import path from 'node:path';

const server = new McpServer(
    {
        name: 'samuraizer',
        version: '0.1.0',
    },
    {
        instructions:
            'Use process_recording for the full pipeline. ' +
            'Use individual tools (normalize_audio, transcribe_audio, summarize_transcript, ' +
            'extract_action_items, extract_decisions) for step-by-step processing.',
    }
);

server.registerTool(
    'normalize_audio',
    {
        title: 'Normalize Audio',
        description: 'Normalize an audio file to 16kHz mono PCM WAV format required by Whisper.',
        inputSchema: {
            inputPath: z.string().describe('Absolute path to the source audio file'),
            outputPath: z.string().describe('Absolute path for the output WAV file'),
        },
    },
    async ({ inputPath, outputPath }) => {
        const ctx = await createContext();
        try {
            const result = await runTool(tools.normalize_audio, {
                inputPath,
                outputPath,
                ffmpegCommand: ctx.config.ffmpegCommand,
            });
            return {
                content: [{ type: 'text', text: result.normalizedAudioPath }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error normalizing audio: ${message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    'transcribe_audio',
    {
        title: 'Transcribe Audio',
        description: 'Transcribe an audio file using whisper.cpp. Returns the transcript text.',
        inputSchema: {
            filePath: z.string().describe('Absolute path to the audio file'),
        },
    },
    async ({ filePath }) => {
        const ctx = await createContext();
        try {
            const result = await runTool(tools.transcribe_audio, {
                audioPath: filePath,
                runDir: path.join(ctx.config.meetingsDir, path.basename(filePath, path.extname(filePath))),
                modelPath: ctx.config.whisperModelPath,
                language: ctx.config.language,
                whisperCommand: ctx.config.whisperCommand,
            });
            return {
                content: [{ type: 'text', text: result.text }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error transcribing audio: ${message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    'summarize_transcript',
    {
        title: 'Summarize Transcript',
        description: 'Generate a concise meeting summary from transcript text.',
        inputSchema: {
            transcriptText: z.string().describe('Full transcript text to summarize'),
            model: z.string().optional().describe('Ollama model to use (optional)'),
        },
    },
    async ({ transcriptText, model }) => {
        const ctx = await createContext();
        try {
            const result = await runTool(tools.summarize_transcript, {
                transcriptText,
                model: model ?? ctx.config.model,
                ollamaBaseUrl: ctx.config.ollamaBaseUrl,
            });
            return {
                content: [{ type: 'text', text: result.summary }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error summarizing transcript: ${message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    'extract_action_items',
    {
        title: 'Extract Action Items',
        description: 'Extract action items from a meeting transcript. Returns a JSON list of tasks with owner and due date.',
        inputSchema: {
            transcriptText: z.string().describe('Full transcript text'),
            model: z.string().optional().describe('Ollama model to use (optional)'),
        },
    },
    async ({ transcriptText, model }) => {
        const ctx = await createContext();
        try {
            const result = await runTool(tools.extract_action_items, {
                transcriptText,
                model: model ?? ctx.config.model,
                ollamaBaseUrl: ctx.config.ollamaBaseUrl,
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error extracting action items: ${message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    'extract_decisions',
    {
        title: 'Extract Decisions',
        description: 'Extract confirmed decisions from a meeting transcript. Returns a JSON list of decisions.',
        inputSchema: {
            transcriptText: z.string().describe('Full transcript text'),
            model: z.string().optional().describe('Ollama model to use (optional)'),
        },
    },
    async ({ transcriptText, model }) => {
        const ctx = await createContext();
        try {
            const result = await runTool(tools.extract_decisions, {
                transcriptText,
                model: model ?? ctx.config.model,
                ollamaBaseUrl: ctx.config.ollamaBaseUrl,
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error extracting decisions: ${message}` }],
            };
        }
    }
);

server.registerTool(
    'process_recording',
    {
        title: 'Process Recording',
        description:
            'Run the full Samuraizer pipeline on an audio file. Returns summary, action items, decisions, and output file paths.',
        inputSchema: {
            filePath: z.string().describe('Absolute path to the audio file'),
            model: z.string().optional().describe('Ollama model to use (optional)'),
        },
    },
    async ({ filePath, model }) => {
        const ctx = await createContext();
        try {
            const { processMeeting } = await import('../orchestrators/process-meeting.js');
            const result = await processMeeting({
                inputPath: filePath,
                meetingsDir: ctx.config.meetingsDir,
                model: model ?? ctx.config.model,
                ollamaBaseUrl: ctx.config.ollamaBaseUrl,
                whisperCommand: ctx.config.whisperCommand,
                whisperModelPath: ctx.config.whisperModelPath,
                language: ctx.config.language,
                ffmpegCommand: ctx.config.ffmpegCommand,
                ffprobeCommand: ctx.config.ffprobeCommand,
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text', text: `Error processing recording: ${message}` }],
                isError: true,
            };
        }
    }
);

export async function startMcpServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('Samuraizer MCP server started and listening for requests...\n');
}
