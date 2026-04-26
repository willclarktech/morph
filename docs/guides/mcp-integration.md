# MCP Integration

`@morphdsl/mcp` is an [MCP](https://modelcontextprotocol.io/) server exposing Morph's parser, validator, and generator as tools. Drop it into any MCP-aware editor or agent so the LLM can author and validate `.morph` schemas without leaving your IDE.

## Claude Code

Project-scoped (`.mcp.json` at the repo root):

```jsonc
{
  "mcpServers": {
    "morph": {
      "command": "bunx",
      "args": ["-y", "@morphdsl/mcp"]
    }
  }
}
```

Or globally in `~/.claude.json` under `mcpServers`. Claude Code picks it up on next launch — verify with `/mcp` in the chat.

## Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project root):

```jsonc
{
  "mcpServers": {
    "morph": {
      "command": "bunx",
      "args": ["-y", "@morphdsl/mcp"]
    }
  }
}
```

## Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.morph]
command = "bunx"
args = ["-y", "@morphdsl/mcp"]
```

## What it exposes

The server registers one MCP tool per Morph operation. Roughly:

- `generation_validate` — validate a domain schema
- `generation_generate` — generate all packages from a schema
- `generation_new_project` — initialise a complete monorepo
- `schema_dsl_parse_morph` — parse `.morph` text to JSON schema
- `schema_dsl_format_dsl` — pretty-print `.morph` source
- `schema_dsl_template_schema` — emit a starter schema
- `schema_dsl_get_diagnostics` — errors and warnings for a file
- `schema_dsl_get_completions` — context-aware completions at a position
- `schema_dsl_get_hover` — hover info at a position
- `schema_dsl_get_symbols` — document outline
- `schema_dsl_get_definition` — go-to-definition
- `schema_dsl_get_folding_ranges` — folding regions

The exact list comes from `schema.morph` and is namespaced by context (`generation_*`, `schema_dsl_*`). Run `bunx @morphdsl/mcp` and exercise it via [`@modelcontextprotocol/inspector`](https://modelcontextprotocol.io/docs/tools/inspector) for a live view.

## Tips

- The server is stateless — each call parses the schema you pass in. There's no persistent project context. Pass full schemas, not filenames.
- For very large schemas, prefer the CLI directly — MCP serialises responses through the agent's context window.
- Generation produces a tree of files in the response. The agent can then write them via its own filesystem tool.
