# Changelog

## [0.1.5] - 2026-08-18

- **New `search_meetings` tool:** searches processed meetings by summary text, name, action items, and decisions. Returns ranked results with a snippet around the best match. Useful for agents that need to find a specific meeting without enumerating all of them. Transcripts are not searched — `get_meeting` returns those.
  - The summary is searched in full. An earlier iteration of this tool matched only `summary_preview`, the first 200 characters, so a term further into the summary produced a confident "No meetings found".
- **`MeetingsStore.all()`:** new store method returning every meeting as a (summary, full document) pair in one directory scan. `search_meetings` uses it instead of `list()` plus one `get()` per meeting, which would rescan the meetings directory once per result.
- Forward `whisperPrompt`, `whisperCarryInitialPrompt`, and `llmConcurrency` through `process_recording` and `transcribe_audio` (requires `@samuraizer/cli` ≥ 0.4.3).
- Bumped the `@samuraizer/cli` dependency to `^0.4.3`. The range was `^0.4.0`, which allowed npm to install a CLI without `whisperDevice`/`whisperPrompt` support — the options were then silently dropped instead of failing loudly.

## [0.1.4] - 2026-07-23

- Fixed `extract_decisions` error handling: failures now correctly return `isError: true` to the MCP client instead of being reported as successful responses.
- Server now reports its real package version in the MCP handshake (was hardcoded to `0.1.0`).
- Forward the `whisperDevice` config option through `process_recording` and `transcribe_audio`, so GPU/device selection works over MCP (requires `@samuraizer/cli` ≥ 0.4.2).
- `prepublishOnly` now runs typecheck and tests before building, so a broken build can't be published.

## [0.1.3] - 2026-05-12

- Added "license": "MIT" field to package.json so npm registry metadata correctly identifies the package as MIT-licensed. Previously the metadata defaulted to "Proprietary" despite the LICENSE file being present in the package. No code changes.

## [0.1.2] - 2026-05-12

- Bumped @samuraizer/cli dependency from ^0.3.0 to ^0.4.0
- Bumped memnex-spec dependency from ^0.1.0 to ^0.2.0
- Test fixtures updated to schema_version "0.2.0"

## [0.1.1] - 2026-05-12

- Switched to memnex-spec dependency
- meetingsDir is now optional and defaults to ~/.samuraizer/meetings
