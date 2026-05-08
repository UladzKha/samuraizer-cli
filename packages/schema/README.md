# @samuraizer/schema

Open schema for meeting outputs — transcripts, summaries, action items, and decisions.

This package defines a portable, vendor-neutral format for the artifacts produced when a meeting recording is processed: who spoke, what was said, what was decided, and what needs to be done. It ships as a JSON Schema (Draft 2020-12), TypeScript types, and a runtime validator.

It is the schema used by [Samuraizer](https://github.com/UladzKha/samuraizer-cli), but it is intentionally tool-agnostic — any pipeline can produce or consume documents in this format.

## Install

```bash
npm install @samuraizer/schema
```

## What's in the package

- **Raw JSON Schema** — `meeting-output.schema.json`, Draft 2020-12, importable directly.
- **TypeScript types** — generated from the schema, available via the `/types` subpath.
- **Runtime validator** — `validate()` and `isValid()`, backed by [ajv](https://ajv.js.org/) with format support.

## Quick start

### Validate a document

```ts
import { validate } from "@samuraizer/schema";

const result = validate(someUnknownData);

if (result.valid) {
  // result.data is typed as MeetingOutput
  console.log(result.data.meeting_id);
} else {
  // result.errors is ValidationError[]
  for (const err of result.errors) {
    console.error(`${err.path}: ${err.message} (${err.keyword})`);
  }
}
```

`validate()` returns a discriminated union — no exceptions, no `null` checks. On success you get the parsed document with full type narrowing; on failure you get a list of errors with JSON Pointer paths.

### Type guard

```ts
import { isValid } from "@samuraizer/schema";

function process(data: unknown) {
  if (isValid(data)) {
    // data is now typed as MeetingOutput
    return data.transcript.text;
  }
  throw new Error("Invalid meeting output");
}
```

`isValid()` is a TypeScript type guard. It returns `true`/`false` only — use `validate()` if you need error details.

### Import types

```ts
import type {
  MeetingOutput,
  TranscriptSegment,
  ActionItem,
  Decision,
} from "@samuraizer/schema/types";
```

> **Note:** the `/types` subpath is types-only (no runtime export). Always use `import type`.

### Import the raw schema

```ts
import schema from "@samuraizer/schema";
// schema is the parsed JSON Schema object — pass it to your own validator,
// generate forms from it, register it with a tool that accepts JSON Schema, etc.
```

## Subpath exports

| Subpath | Resolves to | Use case |
|---|---|---|
| `@samuraizer/schema` | Raw JSON Schema + `validate` / `isValid` / types | Default entry point |
| `@samuraizer/schema/schema` | Raw JSON Schema (alias of root) | Explicit schema-only import |
| `@samuraizer/schema/types` | TypeScript declarations only | `import type { ... }` |
| `@samuraizer/schema/examples/minimal` | Minimal example document | Tests, fixtures, learning |
| `@samuraizer/schema/examples/full` | Full example document | Tests, fixtures, learning |

## Schema overview

Current version: **0.1.0**.

A meeting output document has six required top-level fields — `schema_version`, `meeting_id`, `generated_at`, `source`, `transcript`, `provenance` — and four optional ones — `summary`, `action_items`, `decisions`, `participants`.

For the full field-by-field reference, see [SPEC.md](./spec/SPEC.md). For sample documents, see [spec/examples/](./spec/examples/).

## Versioning

The schema follows [semantic versioning](https://semver.org/):

- **Major** — breaking changes to required fields or value formats.
- **Minor** — new optional fields, new enum values, relaxed constraints.
- **Patch** — clarifications, typo fixes, no semantic change.

`schema_version` in a document is a `const` — currently `"0.1.0"`. New schema versions will introduce a new const value, so consumers can dispatch on it explicitly.

## License

MIT — see [LICENSE](https://github.com/UladzKha/samuraizer-cli/blob/main/LICENSE).
