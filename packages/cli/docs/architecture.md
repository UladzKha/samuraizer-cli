## Overview
Samuraizer is a modular CLI pipeline for processing meeting recordings.

The system is designed to:
- run end-to-end or step-by-step
- reuse intermediate results
- stay local-first
- avoid monolithic processing

Core idea:
Each step is independent and produces artifacts that can be reused.

## Pipeline
1. Validate input
2. Normalize audio
3. Transcribe audio
4. Generate summary
5. Extract action items
6. Extract decisions
7. Generate report

## Architecture
The system is divided into layers:

- CLI (src/cli)
  Handles user input and flags

- Orchestrator (src/orchestrators)
  Controls pipeline execution and step ordering

- Pipeline (src/pipeline)
  Defines domain-specific processing steps

- Tools (src/tools)
  Encapsulates logic (LLM, Whisper, etc.)

- Output (src/pipeline/output)
  Handles file paths and persistence

- Shared (src/shared)
  Shared utilities and definitions

## Principles

- Prefer composition over monolithic pipelines
- Each step should be independently runnable
- Outputs are the source of truth (not in-memory state)
- LLM output must always be validated
- Pipeline should be resumable
- Avoid hidden side effects between steps