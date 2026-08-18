import { describe, it, expect } from "vitest";
import { runWithConcurrency } from "./run-with-concurrency.js";

/** Records how many tasks are in flight at once. */
function makeTracker() {
    const state = { inFlight: 0, peak: 0, started: [] as number[] };
    const task = (id: number, result: unknown) => async () => {
        state.started.push(id);
        state.inFlight++;
        state.peak = Math.max(state.peak, state.inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        state.inFlight--;
        return result;
    };
    return { state, task };
}

describe("runWithConcurrency", () => {
    it("returns results in task order regardless of completion order", async () => {
        const results = await runWithConcurrency(
            [
                async () => {
                    await new Promise((r) => setTimeout(r, 20));
                    return "slow-first";
                },
                async () => "fast-second",
                async () => 42,
            ] as const,
            3,
        );
        expect(results).toEqual(["slow-first", "fast-second", 42]);
    });

    it("keeps types per position", async () => {
        const [text, count] = await runWithConcurrency([async () => "a", async () => 1] as const, 2);
        expect(text.toUpperCase()).toBe("A");
        expect(count.toFixed(0)).toBe("1");
    });

    it("never exceeds the limit", async () => {
        const { state, task } = makeTracker();
        await runWithConcurrency([task(0, 0), task(1, 1), task(2, 2)] as const, 1);
        expect(state.peak).toBe(1);
    });

    it("runs everything at once when the limit allows", async () => {
        const { state, task } = makeTracker();
        await runWithConcurrency([task(0, 0), task(1, 1), task(2, 2)] as const, 3);
        expect(state.peak).toBe(3);
    });

    it("propagates the first rejection and does not start queued tasks", async () => {
        let thirdStarted = false;
        await expect(
            runWithConcurrency(
                [
                    async () => {
                        throw new Error("stage failed");
                    },
                    async () => "ok",
                    async () => {
                        thirdStarted = true;
                        return "never";
                    },
                ] as const,
                1,
            ),
        ).rejects.toThrow("stage failed");
        expect(thirdStarted).toBe(false);
    });

    it("stops sibling workers too, not just the one that failed", async () => {
        const started: number[] = [];
        const task = (id: number, fail = false) => async () => {
            started.push(id);
            await new Promise((r) => setTimeout(r, 5));
            if (fail) throw new Error(`task ${id} failed`);
            return id;
        };

        await expect(
            runWithConcurrency([task(0, true), task(1), task(2), task(3)] as const, 2),
        ).rejects.toThrow("task 0 failed");

        // Tasks 0 and 1 start immediately (limit 2). Task 2 may be picked up by the
        // healthy worker before the failure lands, but nothing is started after it.
        expect(started).not.toContain(3);
    });

    it("reports the first failure when several tasks fail", async () => {
        await expect(
            runWithConcurrency(
                [
                    async () => {
                        await new Promise((r) => setTimeout(r, 5));
                        throw new Error("first");
                    },
                    async () => {
                        await new Promise((r) => setTimeout(r, 20));
                        throw new Error("second");
                    },
                ] as const,
                2,
            ),
        ).rejects.toThrow("first");
    });

    it("handles an empty task list", async () => {
        expect(await runWithConcurrency([] as const, 2)).toEqual([]);
    });

    it("rejects a non-positive limit", async () => {
        await expect(runWithConcurrency([async () => 1] as const, 0)).rejects.toThrow("positive integer");
    });
});
