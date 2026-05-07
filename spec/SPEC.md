# Meeting Output Schema

**Version:** 0.1.0 (draft)
**Schema URI:** `https://samuraizer.dev/schemas/meeting-output/0.1.0/meeting-output.schema.json`
**JSON Schema dialect:** Draft 2020-12
**Status:** Work in progress. Field names and structure may change before 1.0.

## Why this schema exists

Today, every meeting-tool vendor — Otter, Fireflies, Granola, Zoom AI Companion — stores transcripts, summaries, action items and decisions in their own proprietary format inside their own cloud. Users cannot:

- export their meeting data without lock-in,
- feed meeting outputs from one tool into another,
- run independent agents over their own meeting history,
- verify how a transcript or action item was produced.

This schema is a small, opinionated proposal for a portable, tool-agnostic representation of a single processed meeting recording. It is the format Samuraizer emits, but nothing in it is Samuraizer-specific: any local-first or self-hosted meeting tool can produce or consume it.

Design goals, in order of priority:

1. **Portability.** No vendor lock-in. JSON, plain fields, no opaque blobs.
2. **Verifiability.** A consumer can tell which audio, which models, and which tools produced the document.
3. **Local-first friendliness.** Sensible defaults, no required network calls to dereference anything.
4. **Forward compatibility.** Versioned, with explicit rules for adding fields.
5. **Simplicity over completeness.** Cover the common case well; leave room for extension.

## High-level structure

A meeting output is a single JSON document with the following top-level fields:

| Field | Required | Purpose |
|---|---|---|
| `schema_version` | yes | Which version of this schema the document follows. |
| `meeting_id` | yes | Globally unique ID for this output. |
| `generated_at` | yes | When this document was produced. |
| `source` | yes | The original audio file. |
| `transcript` | yes | Time-aligned speech-to-text. |
| `summary` | no | Free-form meeting summary. |
| `action_items` | no | Tasks identified during the meeting. |
| `decisions` | no | Final decisions reached. |
| `participants` | no | Speakers, if known. |
| `provenance` | yes | Which tools and models produced each part. |

The minimum valid document has `schema_version`, `meeting_id`, `generated_at`, `source`, `transcript`, and `provenance`. A transcript-only output is valid; the LLM-derived blocks are all optional.

## Field-by-field reference

### `schema_version`

A semver string matching one of the published schema versions. The current version is `"0.1.0"`. Consumers MUST check this field before parsing and MAY refuse to process documents whose major version they do not understand.

This field is duplicated by the schema's `$id` URL, but having it explicit in the document means tools that have never seen the URL can still detect the version.

### `meeting_id`

A globally unique identifier for this meeting output. ULID is RECOMMENDED:

- 26 characters, Crockford base32, URL-safe;
- lexicographically sortable by creation time, so a directory of files sorts in chronological order without any extra metadata;
- collision-free across machines, unlike timestamp-based IDs.

UUIDs are also accepted. The schema does not enforce ULID format because the field needs to remain forward-compatible with whatever IDs producers want to mint, but `minLength`/`maxLength` constraints rule out empty strings and abuse.

The ID identifies *this output document*, not the underlying audio. Reprocessing the same file with a different model produces a new document with a new `meeting_id`. That is intentional: two outputs with different provenance are different artifacts even when the source bytes are identical.

### `generated_at`

When this document was produced, as an RFC 3339 timestamp with timezone (e.g. `"2026-05-07T14:30:00Z"`). Always present.

We chose RFC 3339 over Unix timestamps because:

- it survives being copy-pasted, eyeballed, and grep-ed by humans;
- it preserves timezone, which Unix timestamps do not;
- it is the de-facto standard format for `format: "date-time"` in JSON Schema and OpenAPI.

This is distinct from `source.recorded_at` (when the recording was captured).

### `source`

Information about the original audio file. The required subset is `file_name`, `sha256`, `format`. Everything else (duration, sample rate, channels, codec, recording time) is optional and added when known.

`sha256` is the most important field in this block. It anchors the chain of custody: any downstream artifact (signed output, derivative document, exported task in Linear or Notion) can be tied back to the exact audio bytes that produced it. Two outputs with the same `source.sha256` came from the same recording even if they used different models.

`file_name` is intentionally a basename only. Stripping the path avoids leaking filesystem layout into shareable documents.

### `transcript`

The time-aligned speech-to-text output, with three required subfields: `language`, `text`, `segments`.

- `language` is a BCP 47 tag (`"en"`, `"ru"`, `"en-US"`). Use `"und"` if undetermined.
- `text` is the full transcript as plain text. It is a convenience field; the canonical content is in `segments`.
- `segments` is an ordered array of transcript chunks. Each segment has its own `id`, time range, text, and optional speaker and confidence.

#### Why segments have stable IDs

The segment `id` (recommended format `seg_NNNN`) is the unit that `action_items[].source_segment_ref` and `decisions[].source_segment_ref` point at. Using a string ID instead of an array index has two benefits:

1. **Stability under re-segmentation.** If a future version of the tool re-segments the transcript (for diarization, for example), array positions shift but IDs can be preserved.
2. **Forward compatibility.** Segments from multiple tracks (per-speaker streams) or merged segments can have IDs that do not correspond to a single linear array position.

#### Approximate timing

Many ASR pipelines, including Samuraizer 0.2.0, do not emit real per-segment timecodes; they emit a flat block of text and the segments are reconstructed line-by-line. The schema flags this honestly with the optional `is_approximate_timing: true` field on a segment. Default is `false`.

This matters for trust: a consumer that wants to navigate audio by clicking on a segment needs to know whether the timing is real or fabricated. We surface that, rather than hide it.

### `summary`

A single-field object with `text`. Plain text or lightweight Markdown. We do not attempt to impose structure (sections, bullet lists) on the summary because LLM summary styles vary widely and over-specification would force consumers to convert.

### `action_items`

An array of tasks. Each item has:

- `id` (`act_NNNN`): stable identifier.
- `text`: the task description.
- `assignee`: free-form name or null. **Not constrained to participants.** LLMs frequently name people who were not in the meeting ("send it to the legal team", "ask Sarah from accounting"). Forcing this to reference `participants[].id` would lose information.
- `due_date`: the original phrasing as it appeared in the meeting (`"by end of week"`, `"next Friday"`). Preserved verbatim.
- `due_date_iso`: a normalized ISO 8601 date (`YYYY-MM-DD`), if the original phrase could be resolved to a calendar date. Null otherwise.
- `status`: lifecycle state (`open`, `in_progress`, `done`, `cancelled`), defaulting to `open`. Forward-compatible: consumers may extend the enum in their own derivations, but the schema fixes the canonical four for interoperability.
- `source_segment_ref`: an array of segment IDs that support this action item. May be empty.

#### Why `due_date` is two fields

LLMs extract due dates from natural-language phrases, and many of those phrases are intentionally fuzzy (`"end of week"`, `"sometime next quarter"`, `"ASAP"`). A single `due_date: ISO 8601` field forces the LLM to either fabricate precision or drop the deadline entirely. Both lose information.

Splitting it into `due_date` (original) and `due_date_iso` (normalized) keeps both layers: humans see the meeting's phrasing, machines see the resolvable deadline. Either may be null independently.

#### Why `source_segment_ref` is an array

Action items often span multiple segments. A request and its acknowledgement ("Bob, can you handle X?" / "Sure, by Friday") together form the evidence for a single item. An array makes this natural; a single ID would force a choice.

The array MAY be empty when the LLM provides no grounding, but producers SHOULD populate it whenever possible. This is the spine of the verifiability story: every derived item links back to specific audio.

### `decisions`

An array of confirmed decisions. Same structure as `action_items` but simpler:

- `id` (`dec_NNNN`)
- `text`
- `context`: optional rationale or surrounding context.
- `source_segment_ref`: same role as in `action_items`.

No assignee, due date, or status — decisions are facts about what was agreed, not tasks.

### `participants`

Optional array of speakers. Each has `id`, `name`, optional `role`. Used to anchor `transcript.segments[].speaker_id` references.

The schema does not require `participants` because diarization is not always performed. When a producer does include participants, segments may reference them by ID; when no diarization is performed, segments simply omit `speaker_id`.

`id` allows diarizer-provided labels (`SPEAKER_00`) as well as numbered slots (`p_0001`). Both are common.

### `provenance`

Two required subfields: `producer` and `pipeline`.

`producer` identifies the software that produced the document — name and semver version. For Samuraizer outputs this is `{ "name": "samuraizer", "version": "0.2.0" }`.

`pipeline` identifies the per-stage tools and models, with each stage optional:

- `transcription`: ASR engine, engine version, model name, model SHA-256.
- `summary`, `action_items`, `decisions`: LLM runtime, runtime version, model name, model digest, temperature.

A document that has only a transcript will have only a `transcription` entry under `pipeline`. A summary-only document (run after the fact) is also valid.

#### Why this granularity

The grant story for Samuraizer is "users own and verify their meeting data". Provenance is what makes "verify" concrete. Given a meeting output, a reviewer can tell:

- which exact ASR engine and model produced the transcript,
- which LLM produced each derived block,
- whether the summary and the action items were produced by the same model or different ones,
- what sampling parameters were used.

Together with `source.sha256` and (in 0.2.0) signed outputs, this makes the document reproducible: in principle, given the same audio and the same listed tools, a third party can re-run the pipeline and check whether the outputs agree.

We deliberately do not require `model_sha256` / `model_digest` in 0.1.0 because not every runtime exposes them ergonomically. We strongly recommend producers include them when available.

## Versioning

This schema follows semantic versioning at the document level:

- **Patch** versions (`0.1.0` → `0.1.1`): clarifications, doc fixes, no schema changes that affect validation.
- **Minor** versions (`0.1.0` → `0.2.0`): backward-compatible additions. New optional fields, new optional `$defs`, new examples. Documents valid under `0.1.x` remain valid under `0.2.x` at the same major version.
- **Major** versions (`0.x` → `1.0`, `1.x` → `2.0`): breaking changes. Field renames, removals, type changes, required field additions.

The `schema_version` field in each document MUST match a published version. Consumers SHOULD accept any minor version within the major version they target.

`0.x` is explicitly an unstable major. `1.0` will be the first stable contract.

## Conformance

A producer is conformant if every document it emits validates against the schema for the `schema_version` it declares.

A consumer is conformant if it accepts any document that validates against the schema for a `schema_version` whose major version it claims to support, including any optional fields it does not use.

Consumers SHOULD ignore unknown fields when the major version matches and they appear in `$defs` extensions. (The current schema uses `additionalProperties: false` on most objects to catch typos in producers; a future minor version may relax this in well-defined extension points.)

## Open questions for 0.2.0 and beyond

- Should `transcript.segments[].text` be required, or should a segment with only a confidence drop and no text be permitted (silence/noise markers)?
- Should `summary` gain optional structured subfields (`headline`, `bullets`) without breaking the free-text default?
- Should `action_items[].priority` be added, and if so, with what enum?
- Should signed outputs be defined in this same schema or as a thin wrapper schema that embeds this one?
- Is `due_date_iso` enough, or do we also need `due_date_window` for "by end of week" → start/end pairs?

These are noted, not decided. Feedback welcome.
