import { defineConfig } from "vitest/config";

// Mirrors packages/mcp-server/vitest.config.ts. The `include` matters here:
// without it vitest also picks up compiled *.test.js under dist/, running every
// suite twice — once from source, once from a possibly stale build.
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
        testTimeout: 10000,
        passWithNoTests: true,
    },
});
