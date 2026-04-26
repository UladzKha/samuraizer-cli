# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-26

### Added

- Initial public release
- `process` command: full pipeline from audio to transcript, summary, action items, and decisions
- Individual commands: `normalize`, `summarize`, `actions`, `decisions`
- Configuration system: `samuraizer init` and `samuraizer config` commands
- Resume processing: skip steps with existing outputs (use `--force` to recompute)
- Local-first: uses Whisper (whisper.cpp) and Ollama, no cloud APIs required
- Output formats: plain text (`transcript.txt`, `summary.txt`, `report.txt`) and JSON (`action-items.json`, `decisions.json`)