# Changelog

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
