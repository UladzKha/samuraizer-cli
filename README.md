# Samuraizer

Turn meeting recordings into transcripts, summaries, action items, and decisions — entirely on your machine. No cloud, no subscriptions, no data leaving your network.

![Samuraizer demo](./assets/demo.gif)

## Why Samuraizer

- **Fully local.** Your recordings never leave your machine.
- **CLI-first.** Scriptable, automatable, integrates with cron, Git hooks, Obsidian workflows.
- **Resumable.** Crashed mid-pipeline? Re-run picks up where it left off.
- **Model-agnostic.** Works with any Ollama-compatible LLM — pick what fits your hardware.
- **Free.** No subscriptions, no per-minute pricing.

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
npm install -g samuraizer
```

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
  "model": "qwen2.5:14b",
  "ollamaBaseUrl": "http://127.0.0.1:11434",
  "whisperCommand": "whisper-cli",
  "ffmpegCommand": "ffmpeg",
  "ffprobeCommand": "ffprobe"
}
```

### Config fields

- **model** — LLM model used for analysis (summary, action items, decisions)
- **ollamaBaseUrl** — URL where Ollama is running
- **whisperCommand** — Command used to run Whisper
- **ffmpegCommand** — Command used for audio processing
- **ffprobeCommand** — Command used for audio inspection

## 📂 Example output

After processing, you'll find structured files in `output/<recording-name>/`:

```
output/meeting/
  transcript.txt
  summary.txt
  action-items.json
  decisions.json
  report.txt
```

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
ollama pull qwen2.5:7b
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

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## 📄 License

MIT — see [LICENSE](./LICENSE).

## 🔗 Source code

Available on GitHub: [github.com/UladzKha/samuraizer-cli](https://github.com/UladzKha/samuraizer-cli)
