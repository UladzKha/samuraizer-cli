# Changelog

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
