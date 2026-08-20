# Changelog

## [0.1.5] - 2026-08-20

- `process_recording` now inherits the CLI's safe `llmConcurrency: 1` default; parallel Ollama analysis requires an explicit configuration override.
- Pipeline progress from `process_recording` is written to stderr instead of stdout; stdout now remains a valid JSON-RPC-only MCP stdio stream.
- Release lifecycle now builds the workspace CLI dependency before typechecking MCP, so `prepublishOnly` succeeds from a clean checkout. Builds clear `dist` first so stale generated files cannot leak into the tarball.
- The published tarball now includes this changelog.
- Updated `@modelcontextprotocol/sdk` and transitive dependencies to patched releases; `npm audit` now reports zero known vulnerabilities.

- **New `search_meetings` tool:** searches processed meetings by summary text, name, action items, and decisions. Returns ranked results with a snippet around the best match. Useful for agents that need to find a specific meeting without enumerating all of them. Transcripts are not searched — `get_meeting` returns those.
  - The summary is searched in full. An earlier iteration of this tool matched only `summary_preview`, the first 200 characters, so a term further into the summary produced a confident "No meetings found".
- **`MeetingsStore.all()`:** new store method returning every meeting as a (summary, full document) pair in one directory scan. `search_meetings` uses it instead of `list()` plus one `get()` per meeting, which would rescan the meetings directory once per result.
- Forward `whisperPrompt`, `whisperCarryInitialPrompt`, and `llmConcurrency` through `process_recording` and `transcribe_audio` (requires `@samuraizer/cli` ≥ 0.4.3).
- Bumped the `@samuraizer/cli` dependency to `^0.4.3`. The range was `^0.4.0`, which allowed npm to install a CLI without `whisperDevice`/`whisperPrompt` support — the options were then silently dropped instead of failing loudly.

- **`search_meetings` now tokenises the query.** It previously matched the whole query as a single substring, so a multi-word query found a meeting only when those exact characters sat together in one field: `patient id post log` returned "No meetings found" even when the summary discussed the patient ID and the action items discussed the post log. The query is now split into words, and a meeting matches when *every* word is found somewhere in the searched fields — the words need not share a field. Individual words still match as substrings (`export` finds `exporter`), so single-word queries behave exactly as before.
  - Wrap the query in double quotes (`"patient id post log"`) to require an exact phrase, which is the previous behaviour when you want it.
  - Ranking sums each field's weight per matching word, and adds one more hit when the whole query appears verbatim, so exact matches still rank above meetings that merely scatter the same words. `matched_in` now lists every field any word matched, and always in field order.
- **Fixed the `transcribe_audio` tool**, which failed for effectively every input with `whisper-cli finished but JSON output was not found`. The underlying CLI tool did not create the run directory it told whisper-cli to write into, and whisper-cli exits `0` rather than failing when that directory is missing. Fixed in `@samuraizer/cli` 0.4.3; see its changelog.

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
