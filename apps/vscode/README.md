# Morph DSL — VS Code support

Language support for [`.morph`](https://willclark.tech/morph/) schema files: algebraic code generation from domain schemas.

## What it does

- **Syntax highlighting** for `.morph` files
- **Bracket matching, comment toggling, auto-closing pairs** via language configuration
- **`Morph: Template Schema`** command to scaffold a new schema from the command palette

## Try it

1. Install this extension.
2. Open or create a file with the `.morph` extension.
3. Start writing — keywords, identifiers, and string literals will be highlighted.

```morph
domain Pastebin

extensions {
  storage [memory, sqlite, redis] default memory
}

context pastes "Simple pastebin for sharing text snippets." {
  @root
  entity Paste "A text snippet shared via URL." {
    content: string "The paste content"
    expiresAt: timestamp? "Optional expiry"
  }

  command create(content: string, expiresAt: timestamp?) -> Paste
  query getById(id: PasteId) -> Paste?
}
```

## Generate apps from your schema

The extension provides editor support for authoring schemas. To generate a full backend, CLI, MCP server, and web UI from a `.morph` file, use the `@morphdsl/cli`:

```sh
npx @morphdsl/cli new-project my-app --schema-file my-app.morph
```

See the [Getting Started guide](https://willclark.tech/morph/docs/guides/getting-started) for a complete walkthrough.

## Links

- **Docs & playground:** https://willclark.tech/morph/
- **GitHub:** https://github.com/willclarktech/morph
- **Issues:** https://github.com/willclarktech/morph/issues

## License

MIT
