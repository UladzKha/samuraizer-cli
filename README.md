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
```

---

## Notes

- The link `./packages/mcp-server` is **relative** — works on GitHub when the README lives at repo root. If GitHub renders it odd in your fork, swap for the full URL: `https://github.com/UladzKha/samuraizer-cli/tree/main/packages/mcp-server`
- I deliberately did **not** mention `@samuraizer/schema` in this snippet. The schema package is internal/unpublished today, and dragging it into the user-facing CLI README would just confuse end-users who don't care about machine-readable formats. Once schema is published as a public artifact (and you have an interop story for third-party consumers), add it then.
- The current root README has no "Packages" or "Monorepo" section. If you want to add one later (good practice once 2+ packages are public), it could read:
  > **Packages in this repo:**
  > - [`samuraizer`](./) — main CLI (this README)
  > - [`@samuraizer/mcp-server`](./packages/mcp-server) — MCP server for AI agents
  > - [`@samuraizer/schema`](./packages/schema) — meeting output schema and spec
  
  But that's optional and probably better off in a separate session, not in this PR.
