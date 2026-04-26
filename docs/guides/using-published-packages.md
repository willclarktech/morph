# Using the Published Packages

Morph ships three things on public registries: the CLI, an MCP server, and a VS Code extension. This page maps each to the install command and where it fits in your workflow.

## The CLI — `@morphdsl/cli`

Generates and validates projects from `.morph` schemas. One-off use:

```sh
bunx @morphdsl/cli generation:new-project pastebin --schema-file pastebin.morph
bunx @morphdsl/cli generation:validate --schema-file pastebin.morph
```

Or install globally:

```sh
bun add -g @morphdsl/cli
morph generation:new-project pastebin --schema-file pastebin.morph
```

All ops are namespaced — `generation:*` for code generation, `schema-dsl:*` for parsing/formatting. Run `morph --help` for the full list.

## The MCP server — `@morphdsl/mcp`

Exposes Morph's operations as MCP tools so an agent can author and validate `.morph` schemas inline. See [MCP integration](./mcp-integration.md) for editor-specific config.

## The VS Code extension — `morphdsl.morph-dsl-vscode`

Syntax highlighting and language services for `.morph` files. Install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=morphdsl.morph-dsl-vscode) or via:

```sh
code --install-extension morphdsl.morph-dsl-vscode
```

See [VS Code extension](./vscode-extension.md) for details.

## Pinning and upgrading versions

Morph uses [changesets](https://github.com/changesets/changesets) with a fixed group, so every published `@morphdsl/*` package shares the same version. When you upgrade, bump them all together.

In a generated project, the deps look like:

```json
"dependencies": {
  "@morphdsl/runtime-cli": "0.1.9",
  "@morphdsl/runtime-api": "0.1.9"
}
```

Upgrade everything in the workspace:

```sh
bun update '@morphdsl/*' --latest
```

The CLI will warn if your generated project's runtime versions don't match the CLI version. Mixed versions inside a single project are unsupported.

For the breaking-change story see [versioning](./versioning.md).

## The playground — try without installing

The [playground](https://willclark.tech/morph/playground) runs the parser and generator entirely in the browser. Useful for experimenting with the DSL before committing to a local install. Generated files appear in a tree view; nothing is persisted.
