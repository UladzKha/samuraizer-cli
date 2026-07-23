# @samuraizer/mcp-server

[Model Context Protocol](https://modelcontextprotocol.io/) server for [Samuraizer](https://github.com/UladzKha/samuraizer-cli) — exposes processed meetings to AI agents (Claude Desktop, Claude Code, MCP Inspector, etc.) over stdio.

The server provides two modes:

- **Query mode** — list and retrieve previously processed meetings as structured data or as MCP resources. Read-only, no LLM or audio dependencies needed at runtime.
- **Process mode** — run the full Samuraizer pipeline (normalize → transcribe → summarize → extract action items / decisions) on an audio file. Requires the same local toolchain as `samuraizer` itself: `whisper-cli`, `ffmpeg`, `ffprobe`, and a running Ollama instance.

Everything stays local. The server reads meetings from a directory on your machine and never sends data to any external service.

## Prerequisites

This package depends on `@samuraizer/cli` for its config and pipeline. Before using the MCP server, install and initialize the CLI:

```bash
npm install -g @samuraizer/cli
samuraizer init
```

Edit the generated config (path printed by `samuraizer config path`) and make sure `meetingsDir` points to the directory where your processed meetings live. The MCP server reads from that same directory.

For **process mode**, you additionally need the Samuraizer runtime dependencies installed and configured: `whisper-cli` from [whisper.cpp](https://github.com/ggerganov/whisper.cpp), `ffmpeg` / `ffprobe`, and a running [Ollama](https://ollama.com/) server with a pulled model. See the [main Samuraizer README](https://github.com/UladzKha/samuraizer-cli#readme) for setup details.

For **query mode only** (`list_meetings`, `get_meeting`, `meeting://` resources), none of the runtime dependencies are required — just a populated `meetingsDir`.

## Installation

```bash
npm install -g @samuraizer/mcp-server
```

This exposes a `samuraizer-mcp` binary on your `PATH`.

## Usage

### Run the server directly

```bash
samuraizer-mcp
```

The server speaks MCP over stdio. It is not meant to be used interactively from a shell — it is intended to be launched by an MCP client such as Claude Desktop or [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

### Inspect with MCP Inspector

```bash
npx @modelcontextprotocol/inspector samuraizer-mcp
```

Opens a browser UI where you can list tools and resources, call them with arguments, and see responses. Useful for debugging.

### Connect from Claude Desktop

Add the server to your Claude Desktop configuration file:

- **macOS / Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux)
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "samuraizer": {
      "command": "samuraizer-mcp"
    }
  }
}
```

If `samuraizer-mcp` is not found by Claude Desktop (PATH issues are common with version managers like `fnm`, `nvm`, or `volta`), use an absolute path instead. Find it with `which samuraizer-mcp`, then:

```json
{
  "mcpServers": {
    "samuraizer": {
      "command": "/absolute/path/to/samuraizer-mcp"
    }
  }
}
```

You can also override the meetings directory per-server via environment variables:

```json
{
  "mcpServers": {
    "samuraizer-personal": {
      "command": "samuraizer-mcp",
      "env": {
        "SAMURAIZER_MEETINGS_DIR": "/Users/me/personal-meetings"
      }
    },
    "samuraizer-work": {
      "command": "samuraizer-mcp",
      "env": {
        "SAMURAIZER_MEETINGS_DIR": "/Users/me/work-meetings"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

### Connect from Claude Code

```bash
claude mcp add samuraizer samuraizer-mcp
```

See the [Claude Code MCP documentation](https://docs.claude.com/) for managing MCP servers from the CLI.

## Configuration

The MCP server reads the same config file as `@samuraizer/cli`. There is no separate config for the server itself.

### Environment variable overrides

All config fields accept env-var overrides, useful for running the server in different contexts (e.g. one MCP server per project):

| Variable                       | Maps to            |
| ------------------------------ | ------------------ |
| `SAMURAIZER_MEETINGS_DIR`      | `meetingsDir`      |
| `SAMURAIZER_MODEL`             | `model`            |
| `SAMURAIZER_OLLAMA_BASE_URL`   | `ollamaBaseUrl`    |
| `SAMURAIZER_WHISPER_COMMAND`   | `whisperCommand`   |
| `SAMURAIZER_WHISPER_MODEL_PATH`| `whisperModelPath` |
| `SAMURAIZER_WHISPER_DEVICE`    | `whisperDevice`    |
| `SAMURAIZER_LANGUAGE`          | `language`         |
| `SAMURAIZER_FFMPEG_COMMAND`    | `ffmpegCommand`    |
| `SAMURAIZER_FFPROBE_COMMAND`   | `ffprobeCommand`   |

Env vars override values from the config file.

## Tools

### Query mode

#### `list_meetings`

List processed meetings, sorted newest first.

**Input:**
- `limit` *(integer, optional)* — maximum number of results to return.

**Returns:** JSON array of meeting summaries (`id`, `name`, `generated_at`, `summary_preview`, `participant_count`, `duration_sec`).

#### `get_meeting`

Retrieve the full processed output for a specific meeting.

**Input:**
- `id` *(string, required)* — the meeting ID (ULID).

**Returns:** the full meeting JSON, including transcript, summary, action items, decisions, and provenance metadata. Returns an error if the meeting is not found.

### Process mode

These tools run parts of the Samuraizer pipeline on demand. They have local runtime dependencies (whisper-cli, ffmpeg, Ollama).

#### `process_recording`

Run the full pipeline on an audio file. **Recommended entrypoint** for processing recordings via an agent.

**Input:**
- `filePath` *(string, required)* — absolute path to the audio file.
- `model` *(string, optional)* — Ollama model to use; falls back to the configured default.

**Returns:** JSON with summary, action items, decisions, and output file paths.

#### `normalize_audio`

Normalize an audio file to 16 kHz mono PCM WAV (the format Whisper expects).

**Input:** `inputPath`, `outputPath` (both required absolute paths).

#### `transcribe_audio`

Transcribe an audio file with whisper.cpp.

**Input:** `filePath` (required absolute path).

#### `summarize_transcript`

Generate a meeting summary from transcript text.

**Input:** `transcriptText` (required), `model` (optional).

#### `extract_action_items`

Extract action items from a transcript.

**Input:** `transcriptText` (required), `model` (optional).

#### `extract_decisions`

Extract confirmed decisions from a transcript.

**Input:** `transcriptText` (required), `model` (optional).

## Resources

The server exposes each processed meeting as an MCP resource:

- **URI scheme:** `meeting://{id}`
- **MIME type:** `application/json`
- **Content:** the full meeting JSON, identical to what `get_meeting` returns.

Listing resources returns one entry per meeting in `meetingsDir`. Reading a resource returns its full content. Resources are particularly useful for clients that surface them in their UI (e.g. Claude Desktop's resource picker).

## Meeting output format

All meeting JSON conforms to the open Samuraizer meeting-output schema, which describes meeting structure, transcript segments, summaries, action items, decisions, and provenance metadata.

The schema and its specification live in the [`memnex-spec`](https://github.com/UladzKha/memnex) package:

- **JSON Schema** (Draft 2020-12): [`spec/meeting-output.schema.json`](https://github.com/UladzKha/memnex/blob/main/packages/memnex-spec-js/spec/meeting-output.schema.json)
- **Human-readable specification**: [`spec/SPEC.md`](https://github.com/UladzKha/memnex/blob/main/spec/SPEC.md)
- **Examples**: [`spec/examples/`](https://github.com/UladzKha/memnex/tree/main/packages/memnex-spec-js/spec/examples)

## Troubleshooting

### `Error: The config file is not created, please run 'samuraizer init'`

The MCP server uses the same config as the CLI. Install `@samuraizer/cli` and run `samuraizer init` first.

### Server starts but `list_meetings` returns an empty array

Either `meetingsDir` is empty, or all `meeting.json` files in it failed schema validation. The server logs structured warnings to stderr for each invalid meeting it skips — check the terminal where the MCP server is running (or the Claude Desktop logs at `~/Library/Logs/Claude/mcp-server-samuraizer.log` on macOS).

### `EACCES` when launching the server

After running `npm run build` from source, the executable bit on `dist/index.js` may need to be set. The package's `postbuild` script handles this automatically when installing from npm. If you cloned the repo, make sure `chmod +x dist/index.js` ran.

### Claude Desktop says the server is not connected

Common causes:

- `samuraizer-mcp` is not on the PATH that Claude Desktop sees. Use an absolute path.
- The config file is invalid JSON. Validate it with `jq . < claude_desktop_config.json`.
- The server is crashing on startup due to a missing config file or invalid config — check the Claude Desktop MCP logs.

## License

MIT — see [LICENSE](./LICENSE).

## Source

[github.com/UladzKha/samuraizer-cli](https://github.com/UladzKha/samuraizer-cli) (monorepo)
