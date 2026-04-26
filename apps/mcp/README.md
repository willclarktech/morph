# @morphdsl/mcp

Morph as an [MCP](https://modelcontextprotocol.io/) server. Drop it into Claude Code, Cursor, Codex, or any MCP-aware tool and the agent gains access to Morph's parser, validator, language services, and code generator.

```jsonc
// .mcp.json (Claude Code, project-scoped)
{
	"mcpServers": {
		"morph": { "command": "bunx", "args": ["-y", "@morphdsl/mcp"] },
	},
}
```

For Cursor / Codex / other editor configs and a full tool list, see the [MCP Integration guide](https://willclark.tech/morph/docs/guides/mcp-integration/).

## Requirements

- [Bun](https://bun.com/install) — the bin entrypoint runs under `bun` (the runtime imports `bun:sqlite`).

## What it exposes

One MCP tool per Morph operation, namespaced by context:

- `generation_*` — schema generation (`generate`, `new_project`, `init`, `validate`)
- `schema_dsl_*` — parsing and language services (`parse_morph`, `format_dsl`, `get_diagnostics`, `get_completions`, `get_hover`, `get_definition`, `get_symbols`, `get_folding_ranges`, `template_schema`)

## Manual run

```sh
bunx @morphdsl/mcp
```

The server speaks JSON-RPC over stdio. Inspect it with [`@modelcontextprotocol/inspector`](https://modelcontextprotocol.io/docs/tools/inspector):

```sh
bunx @modelcontextprotocol/inspector bunx -y @morphdsl/mcp
```

## Links

- [Morph documentation](https://willclark.tech/morph/)
- [MCP Integration guide](https://willclark.tech/morph/docs/guides/mcp-integration/)
- [Source](https://github.com/willclarktech/morph)
- [Issues](https://github.com/willclarktech/morph/issues)

## License

MIT
