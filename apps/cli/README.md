# @morphdsl/cli

The Morph command-line interface — generate, validate, and template `.morph` schemas.

```sh
bunx @morphdsl/cli generation:new-project pastebin --schema-file pastebin.morph
cd pastebin && bun install
bun run --filter '@pastebin/api' start
```

For full installation and walkthrough docs, see the [Getting Started guide](https://willclark.tech/morph/docs/guides/getting-started/).

## Requirements

- [Bun](https://bun.com/install) — the bin entrypoint runs under `bun` (the runtime imports `bun:sqlite`).

## Commands

The CLI is structured by context: `generation:*` operations produce code from a schema, `schema-dsl:*` operations parse and inspect `.morph` source.

```
morph generation:new-project     # scaffold a complete monorepo from a schema
morph generation:generate        # regenerate code in an existing project
morph generation:validate        # parse-only validation
morph generation:init            # emit the monorepo scaffold (no code generation)

morph schema-dsl:parse-morph     # .morph → DomainSchema JSON
morph schema-dsl:format-dsl      # pretty-print .morph source
morph schema-dsl:template-schema # emit a starter schema
morph schema-dsl:validate-dsl    # error/warning report
```

Run `morph --help` for the full list and per-command flags.

## Install globally

```sh
bun add -g @morphdsl/cli
morph --help
```

## Links

- [Morph documentation](https://willclark.tech/morph/)
- [Source](https://github.com/willclarktech/morph)
- [Issues](https://github.com/willclarktech/morph/issues)

## License

MIT
