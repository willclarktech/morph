# VS Code Extension

`morphdsl.morph-dsl-vscode` provides editor support for `.morph` schemas.

## Install

From the VS Code Marketplace UI, search "Morph DSL", or:

```sh
code --install-extension morphdsl.morph-dsl-vscode
```

Direct link: <https://marketplace.visualstudio.com/items?itemName=morphdsl.morph-dsl-vscode>.

## What it does

- **Syntax highlighting** for `.morph` files — keywords, identifiers, string literals, comments.
- **Bracket matching** and auto-closing pairs.
- **Comment toggling** (`Cmd/Ctrl-/`).
- **`Morph: Template Schema`** command — open the command palette and run it to scaffold a starter schema in the current editor.

It does *not* (yet) provide hover, completions, or go-to-definition. Those operations live on the MCP server (`@morphdsl/mcp`); see [MCP integration](./mcp-integration.md) if you want them in your agent flow.

## Quick check it's working

Create `test.morph`:

```morph
domain Test

context things "A context." {
  @root
  entity Thing "A thing." {
    name: string "Display name"
  }
}
```

Keywords (`domain`, `context`, `@root`, `entity`) should colour distinctly from string literals.

## Troubleshooting

- **Nothing is highlighted.** Check the language indicator in the bottom-right of the status bar — it should say "Morph DSL". If it says "Plain Text", click it and pick "Morph DSL" from the dropdown. If that doesn't appear, the extension isn't installed.
- **Old version installed.** The extension publishes alongside the npm packages; latest is on the Marketplace. `code --install-extension morphdsl.morph-dsl-vscode --force` to re-pull.
- **Forking the extension.** It's generated from the same `schema.morph` as the rest of Morph; see `apps/vscode/` and `contexts/generation/targets/vscode/` in the repo if you want to author a variant.

## Source

The extension is generated from `apps/vscode/` in the [Morph repo](https://github.com/willclarktech/morph). The Marketplace listing's overview is `apps/vscode/README.md`, which is the canonical user-facing description.
