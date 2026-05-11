# Snippet for root README.md

> **Reference implementation.** Samuraizer is the reference implementation of the [memnex specification](https://github.com/UladzKha/memnex) — an open standard for portable meeting outputs (transcripts, summaries, action items, decisions).

## Recommended placement

Insert as a new section **between "Why Samuraizer" and "💻 System Requirements"**. This puts it in a position where:

- Readers who are already convinced (just saw "Why") learn there's an MCP option early
- It doesn't bury the existing user-facing setup flow (System Requirements onwards stays intact)

---

## Snippet content (paste verbatim)

```markdown
## 🤖 AI agent access (MCP)

Samuraizer ships with an optional [Model Context Protocol](https://modelcontextprotocol.io/) server that lets AI agents — Claude Desktop, Claude Code, MCP Inspector, and others — query your processed meetings and run the pipeline on demand.

```bash
npm install -g @samuraizer/mcp-server
```

Once installed, agents can list meetings, retrieve full transcripts and summaries, and process new recordings through a structured tool interface. Everything stays local.

See [`@samuraizer/mcp-server`](./packages/mcp-server) for installation, Claude Desktop / Claude Code configuration, and the full tool and resource reference.