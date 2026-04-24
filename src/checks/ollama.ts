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
