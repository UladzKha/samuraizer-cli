import { mkdir, rm } from "node:fs/promises";
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
    whisperDevice: z.union([z.number(), z.string()]).optional(),
    /** Whisper initial prompt (hotwords, domain terms, names). */
    initialPrompt: z.string().optional(),
    /** Re-apply the initial prompt to every decoding window (`--carry-initial-prompt`). */
    carryInitialPrompt: z.boolean().optional(),
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
        // whisper-cli writes its -oj output with no mkdir of its own, and exits 0
        // even when the target directory is missing — the failure only surfaces
        // later as a missing JSON file. The full pipeline gets this directory from
        // prepareOutput, but a standalone call (e.g. the MCP transcribe_audio tool)
        // has nothing to create it, so ensure it here.
        //
        // With recursive:true this returns the topmost directory it had to create,
        // or undefined when the path already existed — exactly what is needed to
        // undo the mkdir on failure without ever touching a pre-existing directory.
        const createdDir = await mkdir(input.runDir, { recursive: true });

        const outputPrefix = path.join(input.runDir, "transcript");
        let transcript;
        try {
            transcript = await transcribeWithWhisper({
                audioPath: input.audioPath,
                outputPrefix,
                modelPath: input.modelPath,
                language: input.language,
                whisperCommand: input.whisperCommand,
                whisperDevice: input.whisperDevice,
                initialPrompt: input.initialPrompt,
                carryInitialPrompt: input.carryInitialPrompt,
            });
        } catch (error) {
            // A failed transcription produced nothing worth keeping; don't leave an
            // empty run directory behind for every bad path a caller passes.
            if (createdDir !== undefined) {
                await rm(createdDir, { recursive: true, force: true }).catch(() => {});
            }
            throw error;
        }

        return {
            text: transcript.text,
            segments: transcript.segments,
            transcriptPath: `${outputPrefix}.txt`,
            sourceAudioPath: transcript.sourceAudioPath,
            language: transcript.language,
        };
    },
};
