/**
 * Run task thunks with at most `limit` in flight, preserving result order.
 *
 * Exists because Promise.all has no upper bound: the LLM stages fan out to
 * Ollama, and every concurrent request makes it reserve another num_ctx-sized
 * KV cache slot. On a GPU that fits the model but not three copies of its
 * context, unbounded fan-out means CPU spillover or an OOM mid-pipeline.
 *
 * Failure semantics match Promise.all: the first rejection propagates. Tasks
 * already in flight run to completion (their results are discarded); tasks not
 * yet started are never started.
 */
export async function runWithConcurrency<T extends ReadonlyArray<() => Promise<unknown>>>(
    tasks: T,
    limit: number,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error(`runWithConcurrency: limit must be a positive integer, got ${limit}`);
    }

    const results = new Array(tasks.length);
    let nextIndex = 0;
    let failure: { error: unknown } | undefined;

    // Workers swallow their own rejection and stop the queue instead of rejecting,
    // so a failure cannot leave sibling workers pulling further tasks — the point of
    // failing fast here is to not spend another LLM call once the run is doomed.
    async function worker(): Promise<void> {
        while (failure === undefined && nextIndex < tasks.length) {
            const index = nextIndex++;
            try {
                results[index] = await tasks[index]!();
            } catch (error) {
                failure ??= { error };
                return;
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));

    if (failure !== undefined) throw failure.error;

    return results as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
