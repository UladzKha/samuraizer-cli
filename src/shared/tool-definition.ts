import {z} from "zod";

export type ToolDefinition<Input, Output> = {
    name: string;
    description: string;
    inputSchema: z.ZodType<Input>;
    outputSchema: z.ZodType<Output>;    
    execute: (input: Input) => Promise<Output>;
};

export async function runTool<Input, Output>(tool: ToolDefinition<Input, Output>, input: Input): Promise<Output> {
    const parsedInput = tool.inputSchema.parse(input);
    const result = await tool.execute(parsedInput);
    return tool.outputSchema.parse(result);
}