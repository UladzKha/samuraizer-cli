import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../../shared/tool-definition.js";
import { transcribeWithWhisper } from "../../pipeline/transcription/transcribe.js";

const segmentSchema = z.object({
    startSec: z.number(),
    endSec: z.number(),
    text: z.string(),
});

const inputSchema = z.object({
    audioPath: z.string().min(1),
    runDir: z.string().min(1),
    modelPath: z.string().min(1),
    language: z.string().min(1),
    whisperCommand: z.string().min(1),
});

const outputSchema = z.object({
    text: z.string(),
    segments: z.array(segmentSchema),
    transcriptPath: z.string().min(1),
    sourceAudioPath: z.string().min(1),
    language: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

export const transcribeAudioTool: ToolDefinition<Input, Output> = {
    name: "transcribe_audio",
    description: "Transcribe audio using whisper.cpp",
    inputSchema,
    outputSchema,
    async execute(input) {
        const outputPrefix = path.join(input.runDir, "transcript");
        const transcript = await transcribeWithWhisper({
            audioPath: input.audioPath,
            outputPrefix,
            modelPath: input.modelPath,
            language: input.language,
            whisperCommand: input.whisperCommand,
        });

        return {
            text: transcript.text,
            segments: transcript.segments,
            transcriptPath: `${outputPrefix}.txt`,
            sourceAudioPath: transcript.sourceAudioPath,
            language: transcript.language,
        };
    },
};
