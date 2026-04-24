import { z } from "zod";
import { ToolDefinition } from "../../shared/tool-definition.js";
import { callOllama } from "../../lib/ollama.js";

const decisionItemSchema = z.object({
    text: z.string().min(1),
});

const inputSchema = z.object({
    transcriptText: z.string().min(1),
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
});

const outputSchema = z.object({
    items: z.array(decisionItemSchema),
});

type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;

const jsonSchema = {
    type: "object",
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    text: { type: "string" },
                },
                required: ["text"],
                additionalProperties: false,
            },
        },
    },
    required: ["items"],
    additionalProperties: false,
} as const;

function buildPrompt(transcript: string): string {
    return [
        "Extract only final decisions from the meeting transcript.",
        "Return ONLY valid JSON matching the required schema.",
        "Do not return markdown, explanations, or any text outside of JSON.",
        "",
        "Rules:",
        "- Include only decisions that were actually agreed or confirmed.",
        "- Do not include action items, discussion points, or open questions.",
        '- If there are no decisions, return {"items":[]}.',
        "",
        "Transcript:",
        transcript,
    ].join("\n");
}

export const extractDecisionsTool: ToolDefinition<Input, Output> = {
    name: "extract_decisions",
    description: "Extract confirmed decisions from a meeting transcript",
    inputSchema,
    outputSchema,
    async execute(input) {
        const raw = await callOllama({
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
            format: jsonSchema,
            temperature: 0,
        });

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(`Failed to parse decisions JSON.\nRaw response:\n${raw}`);
        }

        const result = outputSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Decisions response does not match schema.\n${result.error.message}\nRaw:\n${raw}`);
        }

        return {
            items: result.data.items.filter((item) => item.text.trim().length > 0),
        };
    },
};
