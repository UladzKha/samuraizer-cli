export async function ensureOllama(baseUrl: string): Promise<void> {
    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/ps`, { method: "GET" });
    } catch {
        throw new Error(`Ollama is not reachable at ${baseUrl}. Make sure ollama is running.`);
    }

    if (!response.ok) {
        throw new Error(`Ollama API check failed with ${response.status} ${response.statusText}.`);
    }
}

// A model tag like "qwen2.5:14b" is stored by Ollama as-is, but a bare name
// like "qwen2.5" is stored with an implicit ":latest" suffix — normalize both
// sides before comparing so a config value without a tag still matches.
function withDefaultTag(name: string): string {
    return name.includes(":") ? name : `${name}:latest`;
}

export async function checkOllamaModel(baseUrl: string, model: string): Promise<{ ok: boolean; message: string }> {
    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
    } catch {
        return { ok: false, message: `Could not list Ollama models at ${baseUrl}. Make sure ollama is running.` };
    }

    if (!response.ok) {
        return { ok: false, message: `Ollama model list failed with ${response.status} ${response.statusText}.` };
    }

    let data: { models?: { name?: string }[] };
    try {
        data = (await response.json()) as { models?: { name?: string }[] };
    } catch {
        return { ok: false, message: "Failed to parse Ollama model list response." };
    }

    const names = (data.models ?? []).map((m) => m.name).filter((n): n is string => Boolean(n));
    const found = names.some((name) => withDefaultTag(name) === withDefaultTag(model));

    if (found) {
        return { ok: true, message: `Model '${model}' is available in Ollama` };
    }
    return { ok: false, message: `Model '${model}' is not pulled in Ollama. Run: ollama pull ${model}` };
}
