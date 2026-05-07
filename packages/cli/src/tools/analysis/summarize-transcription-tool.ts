import { z } from "zod";
import { ToolDefinition } from "../../shared/tool-definition.js";
import { callOllama } from "../../lib/ollama.js";

const inputSchema = z.object({
    transcriptText: z.string().min(1),
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
});

const outputSchema = z.object({
    summary: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

function buildPrompt(transcript: string): string {
    return [
        "You are an assistant that summarizes meeting transcripts.",
        "Write a concise and clear summary of the conversation.",
        "Focus on the main discussion points, important context, and outcomes.",
        "Do not invent facts that are not present in the transcript.",
        "Keep the summary readable and structured as plain text.",
        "Transcript:",
        transcript,
    ].join("\n");
}

export const summarizeTranscriptionTool: ToolDefinition<Input, Output> = {
    name: "summarize_transcript",
    description: "Generate a meeting summary from transcript text",
    inputSchema,
    outputSchema,
    async execute(input) {
        const summary = await callOllama({
            baseUrl: input.ollamaBaseUrl,
            model: input.model,
            messages: [
                {
                    role: "system",
                    content: "You are a meeting analyst. Extract action items from transcripts. Return ONLY valid JSON. Do not ask questions. Do not offer further help."
                },
                {
                    role: "user",
                    content: buildPrompt(input.transcriptText),
                }
            ],
        });
        return { summary };
    },
};
