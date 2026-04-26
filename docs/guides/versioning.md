# Versioning and Upgrading

Morph is pre-1.0. Every published `@morphdsl/*` package shares the same version (changesets `fixed` group), so all packages move together.

## What's stable

- The `.morph` DSL surface — `domain`, `context`, `entity`, `command`, `query`, etc. — is unlikely to change shape, though specific tags or extension keys may.
- The CLI command names (`generation:*`, `schema-dsl:*`) and arguments.
- The shape of generated package directories: `apps/{api,cli,ui,mcp,...}`, `contexts/<name>/{dsl,core}`, `libs/client`, `tests/scenarios`.

## What may change

- Generated handler interfaces (the scaffolds in `impls/`) may change shape between versions. Re-running generation is the easiest way to keep up.
- Internal package boundaries inside `@morphdsl/*` — the surface that ends up in your generated project (via `@morphdsl/runtime-{api,cli,...}`) is stable, but if you reach into `@morphdsl/plugin-*` or `@morphdsl/builder-*` directly, expect churn.
- Wire formats for SSE / stored events — pin a single version across producers and consumers until 1.0.

## Upgrading

Inside a generated project:

```sh
bun update '@morphdsl/*' --latest
bun install
bun run build:check
```

If the CLI emits a new code shape (e.g. a new generated file), re-run generation and reconcile any handler changes:

```sh
bunx @morphdsl/cli@latest generation:generate --schema-file schema.morph
```

Generation overwrites generated files but **leaves your `impls/` files alone** — that's where your business logic lives.

## Mismatched versions

Mixing `@morphdsl/runtime-cli@0.1.7` with `@morphdsl/runtime-api@0.1.9` is unsupported. The CLI checks for this and warns. The fix is `bun update '@morphdsl/*' --latest` to bring everything to the same version.

## Pre-1.0 means

- No formal deprecation cycle. If a feature is removed, it's removed in the next release.
- Breaking changes get a *patch* or *minor* bump, not a major. Watch the [changelog](https://github.com/willclarktech/morph/blob/main/CHANGELOG.md) (or the per-package CHANGELOG.md files for finer granularity).
- Once Morph hits 1.0, this changes — semver becomes load-bearing and breaking changes need a major.

## Holding back

`bunx` always fetches the latest unless you pin:

```sh
bunx @morphdsl/cli@0.1.9 generation:new-project ...
```

For a generated project, pinning is just normal `package.json` semantics — change `0.1.9` in your deps to a fixed version.
