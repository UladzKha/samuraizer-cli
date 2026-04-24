import { z } from "zod";
import { ToolDefinition } from "../../shared/tool-definition.js";
import { callOllama } from "../../lib/ollama.js";

const actionItemSchema = z.object({
    text: z.string().min(1),
    owner: z.string().nullable(),
    dueDate: z.string().nullable(),
});

const inputSchema = z.object({
    transcriptText: z.string().min(1),
    model: z.string().min(1),
    ollamaBaseUrl: z.string().url(),
});

const outputSchema = z.object({
    items: z.array(actionItemSchema),
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
                    owner: { type: ["string", "null"] },
                    dueDate: { type: ["string", "null"] },
                },
                required: ["text", "owner", "dueDate"],
                additionalProperties: false,
            },
        },
    },
    required: ["items"],
    additionalProperties: false,
} as const;

function buildPrompt(transcript: string): string {
    return [
        "Extract action items from the meeting transcript.",
        "Return ONLY valid JSON matching the required schema.",
        "Do not return markdown, explanations, or any text outside of JSON.",
        "",
        "An action item is a concrete task that someone must DO after the meeting.",
        "Examples of action items: 'Fix the login bug', 'Send credentials to John', 'Schedule follow-up call'.",
        "",
        "Rules:",
        "- Include ONLY tasks with a clear verb: fix, send, check, create, review, schedule, etc.",
        "- Do NOT include compliments, thank-yous, summaries, or observations.",
        "- Do NOT include things that were already done during the meeting.",
        "- If no clear owner is mentioned, use null.",
        "- If no due date is mentioned, use null.",
        '- If there are no action items, return {"items":[]}.',
        "",
        "Transcript:",
        transcript,
    ].join("\n");
}

export const extractActionItemsTool: ToolDefinition<Input, Output> = {
    name: "extract_action_items",
    description: "Extract action items from a meeting transcript",
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
            throw new Error(`Failed to parse action items JSON.\nRaw response:\n${raw}`);
        }

        const result = outputSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Action items response does not match schema.\n${result.error.message}\nRaw:\n${raw}`);
        }

        return {
            items: result.data.items.filter((item) => item.text.trim().length > 0),
        };
    },
};
