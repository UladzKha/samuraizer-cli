type OllamaChatRequest = {
    model: string;
    messages: { role: string; content: string }[];
    stream: false;
    format?: object;
    options?: { temperature?: number, num_ctx?: number };
};

type OllamaChatResponse = {
    message?: { content?: string };
    done?: boolean;
    error?: string;
};

export async function callOllama({
    baseUrl,
    model,
    format,
    temperature,
    messages,
}: {
    baseUrl: string;
    model: string;
    format?: object;
    temperature?: number;
    messages: { role: "system" | "user" | "assistant"; content: string }[],

}): Promise<string> {
    const body: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        options: {
            num_ctx: 16384,
            ...(temperature !== undefined && { temperature }),
        },
        ...(format && { format }),
    };

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown network error";
        throw new Error(`Failed to connect to Ollama API:\n${message}`);
    }

    if (!response.ok) {
        const text = await safeReadText(response);
        throw new Error(`Ollama API returned ${response.status} ${response.statusText}.\n${text}`);
    }

    let data: OllamaChatResponse;
    try {
        data = (await response.json()) as OllamaChatResponse;
    } catch {
        throw new Error("Failed to parse Ollama API JSON response.");
    }

    if (data.error) {
        throw new Error(`Ollama API error: ${data.error}`);
    }

    const text = data.message?.content?.trim();
    if (!text) {
        throw new Error("Ollama API returned an empty response.");
    }

    return text;
}

async function safeReadText(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        return "";
    }
}
