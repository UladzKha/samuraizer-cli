# Changelog

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
