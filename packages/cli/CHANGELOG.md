# Changelog

## [0.4.3] - 2026-08-18

- Pipeline progress is now delivered through an optional callback instead of writing directly to stdout, so embedders such as the MCP stdio server cannot have their protocol stream corrupted.
- Release checks now run the CLI test suite before publishing, and clean-checkout monorepo typechecking builds the CLI declarations before checking MCP. Builds clear `dist` first so stale generated files cannot leak into the tarball.
- Updated development dependencies to patched releases; `npm audit` now reports zero known vulnerabilities.
- Fixed the README model examples so the generated config, installation command, and out-of-memory guidance consistently use the documented Qwen 2.5 models.

- Added `whisperPrompt` config option: initial prompt / hotwords passed to whisper-cli (`--prompt`) to bias decoding toward domain terms, participant names, or acronyms. Set via `SAMURAIZER_WHISPER_PROMPT` env var. When unset, behavior is unchanged.
- Added `whisperCarryInitialPrompt` config option (default `false`): maps to whisper-cli `--carry-initial-prompt`. whisper.cpp applies the initial prompt to the first decoding window only, so on a long recording hotword biasing fades after the opening minutes; enabling this re-applies the prompt to every window. Set via `SAMURAIZER_WHISPER_CARRY_INITIAL_PROMPT`.

- **Parallel LLM stages:** summary, action items, and decisions are now requested concurrently instead of sequentially. On a model small enough for Ollama to serve several requests at once this cut LLM wall time for a 4-minute meeting from ~126s to ~55s (~2.3×). Cached (skip) behavior is unchanged — if any stage is already on disk and `--force` is not set, it is still skipped.
  - The speedup depends on `OLLAMA_NUM_PARALLEL`: when Ollama allocates a single slot (its choice when the model already fills the GPU) the requests queue server-side and wall time matches the sequential pipeline. Measured with `qwen3.8:27b` on a 24 GB GPU at the default setting: 24.0s concurrent vs 24.2s sequential — no gain. See "LLM concurrency and VRAM" in the README for how to check which you have.
- Added `llmConcurrency` config option (default `3`, range `1-3`, env `SAMURAIZER_LLM_CONCURRENCY`) to bound that fan-out. Each slot Ollama allocates is another `num_ctx`-sized KV cache, so three concurrent stages need roughly three times the context memory of one; set it to `1` to restore sequential behavior on a memory-constrained GPU.
- `samuraizer init` now writes the optional fields (`whisperDevice`, `whisperPrompt`, `whisperCarryInitialPrompt`, `llmConcurrency`) into the generated config with inert defaults, and prints a pointer to the README. Previously they were documented only as source comments, which `JSON.stringify` stripped before the file was written — so a fresh config gave no hint they existed.
- **Packaging:** test files are no longer compiled into `dist`, so the published tarball no longer ships them (`tsconfig.json` now excludes `*.test.ts`, matching `@samuraizer/mcp-server`). Added a `vitest.config.ts` limiting test discovery to `src/`, which also stops vitest from re-running stale compiled copies out of `dist`.
- **meta.json:** the `summarized` and `action_items_extracted` status values are gone. The three LLM stages now complete as one step and are persisted together, so `decisions_extracted` means all three artifacts are on disk. A crash mid-stage leaves the status at `transcribed` instead of claiming progress the run did not finish. Cached-resume is unaffected — it keys off files on disk, not the status field.

- **Fixed `transcribe_audio` outside the full pipeline.** The tool derived its output prefix from `runDir` but never created that directory. In `samuraizer process` this was masked, because `prepareOutput` had already created it; called on its own — which is what the MCP server's `transcribe_audio` tool does — the directory was missing. whisper-cli exits `0` in that case without writing anything, so the failure surfaced as the misleading `whisper-cli finished but JSON output was not found`, after the transcription had actually run. The tool now creates the directory itself, and removes it again if transcription fails, so a bad path does not leave an empty run directory behind. A directory that already existed is never removed.
- **`process` no longer leaves an orphan run directory for an unreadable file.** `probeAudio` now runs before `prepareOutput` rather than after it. `validateInputFile` only checks the path and the extension, so a non-audio file with an audio extension used to get a run directory and a `meta.json` before anything looked inside it, and both stayed on disk after the run failed. The external-tool checks (`ffmpeg`, `ffprobe`, `whisper-cli`, Ollama) also moved ahead of it, so a missing dependency no longer creates a directory either.
- **Clearer errors for mistyped paths.** `samuraizer normalize` checks that the input exists before invoking ffmpeg, instead of surfacing a failure buried under ~25 lines of ffmpeg version banner; it also passes `-v error` to ffmpeg so genuine failures stay readable. `summarize`, `actions`, and `decisions` report `Transcript file does not exist: <path>` (or `Path is a directory, not a transcript file`) rather than a raw Node `ENOENT`. Exit codes are unchanged — every one of these paths still exits `1`.

## [0.4.2] - 2026-07-23

- Added `whisperDevice` config option to choose which GPU/device whisper-cli runs on. Accepts a device index (`0`, `1`), a comma-separated list (`"0,1"`), or a GPU UUID — value semantics match `CUDA_VISIBLE_DEVICES`. Also settable via the `SAMURAIZER_WHISPER_DEVICE` environment variable. When unset, behavior is unchanged.
- Transcription now runs whisper-cli with additional decoding flags (`-sns`, `-mc 0`, `-et 2.6`) to suppress non-speech tokens and reduce hallucinated output. Transcripts may differ slightly from 0.4.x.
- Added a Vitest test suite for the transcription env-override logic, plus `test` / `test:watch` scripts.

## [0.4.1] - 2026-05-13

- Added package-specific README (visible on npm package page). Previously the npm page showed "This package does not have a README"; root repo README was the only source of CLI documentation.
- Fixed `bin.samuraizer` manifest path: removed leading `./` prefix so the field matches what `npm pkg fix` auto-normalizes the published tarball to.
- No runtime code changes; output behavior identical to 0.4.0.

## [0.4.0] - 2026-05-12

- Output format conforms to memnex specification v0.2 (schema_version "0.2.0")
- Added pipeline_config snapshot to output: language_hint, output_stages, chunking strategy
- Added engine_version / runtime_version best-effort detection in provenance fields
- Bumped memnex-spec dependency from ^0.1.0 to ^0.2.0

## [0.3.0] - 2026-05-12

- Output format conforms to memnex specification v0.1
- Switched from workspace-internal @samuraizer/schema to published memnex-spec dependency
