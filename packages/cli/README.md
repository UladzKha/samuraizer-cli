# @samuraizer/cli

Local-first CLI that turns meeting recordings into transcripts, summaries, action items, and decisions — entirely on your machine. No cloud, no subscriptions, no data leaving your network.

![Samuraizer demo](https://raw.githubusercontent.com/UladzKha/samuraizer-cli/main/packages/cli/assets/demo.gif)

> **Reference implementation of the [memnex specification](https://github.com/UladzKha/memnex).** All outputs conform to memnex v0.2, including a full provenance chain.

## 💻 System Requirements

| RAM    | Recommended model       |
| ------ | ----------------------- |
| 8 GB   | `qwen2.5:3b`            |
| 16 GB  | `qwen2.5:7b`            |
| 32 GB+ | `qwen2.5:14b` (default) |

Apple Silicon (M1/M2/M3/M4) and recent x86 CPUs with AVX2 are recommended.
Whisper transcription is CPU/Metal-accelerated; LLM inference uses Ollama's defaults.

## ⚙️ Prerequisites

Install the required tools:

- **Node.js** ≥ 20 — [nodejs.org](https://nodejs.org/)
- **ffmpeg** — for audio processing
- **whisper-cli** — from [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- **Ollama** — [ollama.com](https://ollama.com/)

Start Ollama and pull a model:

```bash
ollama serve
ollama pull qwen2.5:14b
```

## 📦 Installation

```bash
npm install -g @samuraizer/cli
```

> **Migrating from the legacy `samuraizer` package?** Versions ≤ 0.2.0 of the unscoped `samuraizer` package on npm are deprecated. Run `npm uninstall -g samuraizer && npm install -g @samuraizer/cli` to migrate. The CLI binary on your PATH is still called `samuraizer`.

## 🚀 Quick Start

```bash
samuraizer init
samuraizer process meeting.m4a
```

On a 30-minute recording this typically takes 3–5 minutes on Apple Silicon and 8–15 minutes on x86 CPUs, depending on the model.

## 🧪 Commands

### Process an audio file

```bash
samuraizer process meeting.m4a              # full pipeline
samuraizer process meeting.m4a --verbose    # show detailed metadata
samuraizer process meeting.m4a --force      # recompute all steps
samuraizer process meeting.m4a --verbose --force
```

### Run individual steps

```bash
samuraizer normalize input.m4a output.wav   # normalize audio for Whisper
samuraizer summarize transcript.txt         # generate summary from transcript
samuraizer actions transcript.txt           # extract action items
samuraizer decisions transcript.txt         # extract decisions
```

### Configuration

```bash
samuraizer init           # create default config file
samuraizer config path    # show config file location
samuraizer config get     # print resolved config as JSON
```

### Other

```bash
samuraizer --help
samuraizer --version
```

## ⚙️ Configuration

Samuraizer uses a global JSON config file.

### Config location

- **macOS**: `~/Library/Application Support/samuraizer/config.json`
- **Linux**: `~/.config/samuraizer/config.json`
- **Windows**: `%AppData%/samuraizer/config.json`

### Example config

```json

{
  "model": "qwen3.5:14b",
  "ollamaBaseUrl": "http://127.0.0.1:11434",
  "whisperCommand": "whisper-cli",
  "whisperModelPath": "/absolute/path/to/ggml-model.bin",
  "language": "en",
  "ffmpegCommand": "ffmpeg",
  "ffprobeCommand": "ffprobe"
}
```

### Config fields

- **model** — LLM model used for analysis (summary, action items, decisions)
- **ollamaBaseUrl** — URL where Ollama is running
- **whisperCommand** — Command used to run Whisper
- **whisperDevice** *(optional)* — GPU/device whisper-cli runs on. Accepts a device index (`0`, `1`), a comma-separated list (`"0,1"`), or a GPU UUID; value semantics match `CUDA_VISIBLE_DEVICES`. Omit to use the default device.
- **whisperPrompt** *(optional)* — Initial prompt / hotwords passed to whisper-cli (`--prompt`). Bias decoding toward domain terms, participant names, or acronyms you know will appear. Keep under ~200 characters. Example: `"Patient ID, CR, Change Request, Spider, Grant"`.
- **whisperCarryInitialPrompt** *(optional, default `false`)* — Re-apply `whisperPrompt` to every decoding window (`--carry-initial-prompt`). By default whisper.cpp uses the initial prompt for the first window only, so on a long recording the hotword bias fades after the opening minutes. Enable this to keep it active throughout; the trade-off is that the prompt occupies context in every window and, if it is long or unnatural, can leak into the transcript.
- **ffmpegCommand** — Command used for audio processing
- **ffprobeCommand** — Command used for audio inspection
- **llmConcurrency** *(optional, default `3`, range `1-3`)* — How many of the three LLM stages (summary, action items, decisions) run at the same time. See [LLM concurrency and VRAM](#llm-concurrency-and-vram).

Every config field can also be overridden with an environment variable, e.g. `SAMURAIZER_WHISPER_DEVICE=1 samuraizer process meeting.m4a`. Booleans accept `1/0`, `true/false`, `yes/no`, or `on/off`.

### Selecting a GPU

If your machine has multiple GPUs, pin whisper transcription to a specific one:

```json
{
  "whisperDevice": 1
}
```

Or per-run, without editing the config:

```bash
SAMURAIZER_WHISPER_DEVICE=1 samuraizer process meeting.m4a
```

### LLM concurrency and VRAM

Summary, action items, and decisions are independent of each other, so Samuraizer issues all three requests at once (`llmConcurrency`, default `3`).

**Whether that actually runs in parallel is Ollama's decision, not Samuraizer's.** The server processes `OLLAMA_NUM_PARALLEL` requests per model at a time; anything beyond that queues. If it resolves to `1` — which is what Ollama picks when the model already fills most of the GPU — the three requests are served one after another and the wall time is identical to the sequential pipeline. There is no error, no warning, just no speedup.

To check what your server actually allocated, run a stage and inspect the loaded runner:

```bash
curl -s http://127.0.0.1:11434/api/ps | grep context_length
```

Samuraizer requests `num_ctx: 16384`. A `context_length` of 16384 means one slot (requests queue); 49152 means three slots (genuine parallelism). To get the latter, start Ollama with `OLLAMA_NUM_PARALLEL=3` — and budget for it: each slot is another full KV cache, so three slots need roughly three times the context memory of one. On a GPU where the model fits but three copies of its context do not, Ollama spills layers to CPU, which is *slower* than running the stages sequentially.

Measured on a 24 GB GPU with `qwen3.8:27b` (18.6 GB resident, `OLLAMA_NUM_PARALLEL` at its default): 24.0s with `llmConcurrency: 3` versus 24.2s with `llmConcurrency: 1` — the fan-out bought nothing, because the server serialized it anyway. Smaller models that leave room for several slots are where the ~2.3× speedup shows up.

If the fan-out hurts rather than helps, turn it off:

```json
{
  "llmConcurrency": 1
}
```

```bash
SAMURAIZER_LLM_CONCURRENCY=1 samuraizer process meeting.m4a
```

Setting it to `1` restores the pre-0.4.3 sequential behavior.

## 📂 Example output

After processing, you'll find structured files in `output/<recording-name>/`:

```
output/meeting/
  transcript.txt
  summary.txt
  action-items.json
  decisions.json
  report.txt
  meeting.json
```

The `meeting.json` file is a [memnex v0.2](https://github.com/UladzKha/memnex)-conforming document combining all outputs with a full provenance chain.

**`summary.txt`**

```
Team standup focused on Q2 roadmap and infrastructure migration.
The frontend team will start the Next.js upgrade next week...
```

**`action-items.json`**

```json
[
  {
    "owner": "Alice",
    "task": "Set up staging environment for migration testing",
    "deadline": "by end of week"
  },
  {
    "owner": "Bob",
    "task": "Review the auth refactor PR",
    "deadline": null
  }
]
```

**`decisions.json`**

```json
[
  {
    "decision": "Adopt Next.js 15 for the new dashboard",
    "rationale": "Better SSR and built-in App Router support"
  }
]
```

## 🔁 Resume behavior

Samuraizer skips steps whose output files already exist. If processing crashes or you stop it mid-pipeline, just re-run the same command — completed steps are reused.

Use `--force` to recompute everything from scratch.

## ⚠️ Troubleshooting

### Ollama not running

```bash
ollama serve
```

### Ollama on a non-default port

Update `ollamaBaseUrl` in your config:

```json
{
  "ollamaBaseUrl": "http://127.0.0.1:11500"
}
```

### Out of memory during analysis

Switch to a smaller model:

```bash
ollama pull qwen3.5:14b
```

Then update `model` in your config to `qwen2.5:7b` (or `qwen2.5:3b` on machines with 8 GB RAM).

### Model not found

Make sure the model in your config is actually pulled:

```bash
ollama list
ollama pull <model-name>
```

### `whisper-cli` not in PATH

Build [whisper.cpp](https://github.com/ggerganov/whisper.cpp) and ensure the binary is on your `PATH`, or set the absolute path in `whisperCommand` in your config.

### `ffmpeg` not found

**macOS:**

```bash
brew install ffmpeg
```

**Linux:**

```bash
# Debian / Ubuntu
sudo apt install ffmpeg

# Arch / CachyOS
sudo pacman -S ffmpeg

# Fedora
sudo dnf install ffmpeg
```

**Windows:**

```powershell
winget install Gyan.FFmpeg
```

## 🤖 AI agent access (MCP)

Samuraizer also ships with a companion MCP server, [`@samuraizer/mcp-server`](https://www.npmjs.com/package/@samuraizer/mcp-server), that lets AI agents (Claude Desktop, Claude Code, MCP Inspector) query your processed meetings and run the pipeline on demand.

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## 📄 License

MIT — see [LICENSE](./LICENSE).

## 🔗 Source code

Part of the Samuraizer monorepo: [github.com/UladzKha/samuraizer-cli](https://github.com/UladzKha/samuraizer-cli).
