# Changelog

## [0.1.7] - 2026-09-07

- The npm manifest now carries `description`, `keywords`, `repository`, `homepage`, `bugs`, and `author`. The package page previously showed no description at all, and npm search had almost nothing to rank the package on. `repository.directory` points at the package inside the monorepo rather than the repository root, so the npm page links to this directory and not to the top of the tree.
- `server.json` gained `title`, `repository.subfolder`, `repository.id`, and `registryBaseUrl`, and now declares the `SAMURAIZER_MEETINGS_DIR` environment variable. MCP clients can prompt for the meetings directory during setup rather than leaving it to be discovered from the config file afterwards. `repository.id` is the GitHub numeric repository ID, which lets the registry detect a repository that was deleted and recreated under the same name.
- Publishing to the official MCP registry now runs from a `workflow_dispatch` GitHub Action authenticated by OIDC, replacing the manual `mcp-publisher` invocation. npm publishing stays manual, and must still happen first: the registry verifies that the npm package exists at the given version and carries a matching `mcpName`.
- The package consistency test now asserts that the version in `package.json` matches both version fields in `server.json`, and that `mcpName` matches the registry server name. A mismatch previously surfaced only when the registry rejected the publish, by which point the npm release had already gone out and the version number was spent.
- The README now opens with a one-line description of what the server does and a list of every tool it exposes, so the first screen answers what the package is rather than how to install it.
- Transitive dependencies in the workspace lockfile were updated to patched releases; `npm audit` reports zero known vulnerabilities again. No dependency range changed, so the published package is unaffected.

## [0.1.6] - 2026-08-20

- Added the `mcpName` field (`io.github.UladzKha/samuraizer`) to `package.json`, which the MCP registry requires to verify that this npm package belongs to the registered server.

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
