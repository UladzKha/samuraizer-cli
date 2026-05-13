# Samuraizer

Turn meeting recordings into transcripts, summaries, action items, and decisions — entirely on your machine. No cloud, no subscriptions, no data leaving your network.

> **Reference implementation.** Samuraizer is the reference implementation of the [memnex specification](https://github.com/UladzKha/memnex) — an open standard for portable meeting outputs (transcripts, summaries, action items, decisions). All outputs conform to memnex v0.2, including a full provenance chain.

## Why Samuraizer

- **Fully local.** Your recordings never leave your machine.
- **CLI-first.** Scriptable, automatable, integrates with cron, Git hooks, Obsidian workflows.
- **Resumable.** Crashed mid-pipeline? Re-run picks up where it left off.
- **Model-agnostic.** Works with any Ollama-compatible LLM — pick what fits your hardware.
- **Free.** No subscriptions, no per-minute pricing.

## 📦 Packages

This is a monorepo. Samuraizer is published as two npm packages, each with its own README and changelog:

| Package | What it does | Docs |
|---|---|---|
| [`@samuraizer/cli`](https://www.npmjs.com/package/@samuraizer/cli) | The meeting-processing CLI — install, configure, and run the local pipeline. **Start here.** | [packages/cli/README.md](./packages/cli/README.md) |
| [`@samuraizer/mcp-server`](https://www.npmjs.com/package/@samuraizer/mcp-server) | Companion [Model Context Protocol](https://modelcontextprotocol.io/) server. Lets AI agents (Claude Desktop, Claude Code, MCP Inspector) query your processed meetings and trigger the pipeline. | [packages/mcp-server/README.md](./packages/mcp-server/README.md) |

## 🏛 Project status

- **memnex specification: v0.2** — see [the memnex repo](https://github.com/UladzKha/memnex) for the schema, conformance suite, and governance documents.
- **Schemastore registered.** memnex is in the [universal JSON Schema catalog](https://github.com/SchemaStore/schemastore) (PR [#5676](https://github.com/SchemaStore/schemastore/pull/5676)). `*.memnex.json` and `meeting-output.json` files get IDE autocomplete and validation by default in VS Code, JetBrains IDEs, Neovim, Sublime, and other editors with language-server support.
- **Roadmap:** local diarization, cryptographic signing UX, accessibility (WebVTT subtitles), and the path to memnex v1.0 are funded milestones.

## 🤝 Contributing

Samuraizer follows a BDFL bootstrap model — see the memnex [GOVERNANCE.md](https://github.com/UladzKha/memnex/blob/main/GOVERNANCE.md) for the broader project's governance model, which Samuraizer mirrors.

Bug reports and feature discussions are welcome in [GitHub Issues](https://github.com/UladzKha/samuraizer-cli/issues).

## 📝 Changelogs

- [`packages/cli/CHANGELOG.md`](./packages/cli/CHANGELOG.md)
- [`packages/mcp-server/CHANGELOG.md`](./packages/mcp-server/CHANGELOG.md)

## 📄 License

MIT — see [LICENSE](./LICENSE).
