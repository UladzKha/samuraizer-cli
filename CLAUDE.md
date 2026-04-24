# Samuraizer

## Project overview
Samuraizer is a local-first CLI tool for processing meeting recordings.
It transcribes audio, generates summaries, extracts action items and decisions, and saves structured outputs to files.
The project should remain modular and composable rather than becoming a monolithic pipeline.

## Tech stack
- Node.js
- TypeScript
- tsx
- zod
- Ollama
- whisper-cli / whisper.cpp
- ffmpeg / ffprobe

## Architecture principles
- Keep the pipeline split into clear steps.
- Prefer small composable modules over large orchestrator files.
- Separate parsing/transformation logic from file system side effects.
- Keep local-first and offline-first design intact.

## Core flow
Typical flow:
1. Resolve input file
2. Normalize audio
3. Transcribe audio
4. Generate summary
5. Extract action items
6. Extract decisions
7. Validate outputs
8. Persist results to file

## Non-negotiable rules
- Do not change public CLI commands unless explicitly asked.
- Validate all LLM-generated structured output with zod.
- Do not assume LLM output is valid JSON.
- Preserve output contract stability for downstream steps.
- Do not remove useful debug logs unless explicitly asked.
- Prefer explicit types in exported APIs.

## Coding style
- Prefer named exports over default exports.
- Keep functions focused and testable.
- Prefer pure helper functions for parsing and transformation.
- Add comments only where reasoning is non-obvious.
- Avoid unnecessary abstractions.

## Output contracts
Action items output shape:
{
    "items": [
        {
            "text": "string",
            "owner": "string",
            "dueDate": "string | null"
        }
    ]
}

Decisions output shape:
{
    "items": [
        {
            "text": "string"
        }
    ]
}

## Important constraints
- LLM responses may be malformed or incomplete.
- File paths must work on Linux, Windows, and macOS.
- Some steps depend on external local tools being installed.
- The project should support both full-pipeline execution and step-by-step execution.

## Validation commands
- npm run build
- npm run typecheck

## Important directories
- src/cli
- src/tools
- src/shared
- output

## When making changes
- First understand the existing flow before editing.
- Prefer minimal safe changes.
- After edits, run the relevant validation commands.
- If changing output schema or CLI behavior, call it out explicitly.
