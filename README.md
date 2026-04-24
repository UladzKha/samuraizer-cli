# Samuraizer

Local-first CLI for meeting transcription and analysis.

Samuraizer processes audio recordings and generates:
- transcript
- summary
- action items
- decisions
- report

All processing is done locally using tools like Whisper and Ollama


## ✨ Features

- 🎙 Transcribe audio recordings (Whisper)
- 🧠 Generate summaries (local LLM via Ollama)
- ✅ Extract action items
- 📌 Extract decisions
- ⚡ Resume processing (skip already processed steps)
- 🔧 Simple CLI + config system
- 🔒 Local-first (no cloud required)


## 📦 Installation

```bash
npm install -g samuraizer
```

## ⚙️ Prerequisites

Make sure you have installed:
```bash
Node.js >= 20
ffmpeg
whisper-cli (whisper.cpp)
Ollama
Start Ollama
ollama serve
ollama pull qwen2.5:14b
```

## 🚀 Quick Start
```bash
samuraizer init
samuraizer process meeting.m4a
```

## ⚙️ Configuration

Samuraizer uses a global JSON config file.

### Initialize config
```bash
samuraizer init
```

### Config location
* **macOS**: `~/Library/Application Support/samuraizer/config.json`
* **Linux**: `~/.config/samuraizer/config.json`
* **Windows**: `%AppData%/samuraizer/config.json`

### View config
```bash
samuraizer config get
```
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

### 🧩 Config fields

- **model** — LLM model used for analysis (summary, action items, decisions)
- **ollamaBaseUrl** — URL where Ollama is running
- **whisperCommand** — Command used to run Whisper
- **ffmpegCommand** — Command used for audio processing
- **ffprobeCommand** — Command used for audio inspection


## 🧪 Commands

### Show help

```bash
samuraizer --help
```

### Show version

```bash
samuraizer --version
```

## 🚀 Full pipeline

### Process an audio recording:
```bash
samuraizer process meeting.m4a
```

### Show detailed metadata after processing:
```bash
samuraizer process meeting.m4a --verbose
```

### Recompute all steps even if outputs already exist:
```bash
samuraizer process meeting.m4a --force
```

### You can combine flags:
```bash
samuraizer process meeting.m4a --verbose --force
```

## 🎛 Individual commands

### Normalize audio to Whisper-compatible WAV:
```bash
samuraizer normalize input.m4a output.wav
```

### Summarize a transcript file:
```bash
samuraizer summarize transcript.txt
```

### Extract action items from a transcript file:
```bash
samuraizer actions transcript.txt
```

### Extract decisions from a transcript file:
```bash
samuraizer decisions transcript.txt
```


## ⚙️ Configuration commands

### Create the default config file:
```bash
samuraizer init
```

### Print config file path:
```bash
samuraizer config path
```

### Print resolved config as JSON:
```bash
samuraizer config get
```


### 📂 Output
```json
output/<file-name>/
  transcript.txt
  summary.txt
  action-items.json
  decisions.json
  report.txt
  ```


### 🔁 Resume Behavior

Samuraizer skips already processed steps.

Use `--force` to rebuild everything.


### ⚠️ Common Issues
#### Ollama not running
```bash
ollama serve
```

#### ffmpeg not found

macOS:
```bash
brew install ffmpeg
```

Linux:
```bash
apt install ffmpeg
```

### 📄 License

ISC

## 🔗 Source Code

### Source code is available on GitHub:

https://github.com/UladzKha/samuraizer-cli