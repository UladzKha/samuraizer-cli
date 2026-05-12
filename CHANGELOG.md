# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 
### Removed
- `samuraizer mcp` command. MCP server functionality moved to
  separate package @samuraizer/mcp-server. Install with:
    npm install -g @samuraizer/mcp-server
  Run with: samuraizer-mcp

## [0.2.0] - 2026-05-06

### Added
- MCP server support
- MCP tools for:
    - audio normalization
    - transcription
    - transcript summarization
    - action items extraction
    - decision extraction
    - full recording processing pipeline
- Compatibility with MCP clients such as Claude Desktop and MCP Inspector


## [0.1.0] - 2026-04-26

### Added

- Initial public release
- `process` command: full pipeline from audio to transcript, summary, action items, and decisions
- Individual commands: `normalize`, `summarize`, `actions`, `decisions`
- Configuration system: `samuraizer init` and `samuraizer config` commands
- Resume processing: skip steps with existing outputs (use `--force` to recompute)
- Local-first: uses Whisper (whisper.cpp) and Ollama, no cloud APIs required
- Output formats: plain text (`transcript.txt`, `summary.txt`, `report.txt`) and JSON (`action-items.json`, `decisions.json`)