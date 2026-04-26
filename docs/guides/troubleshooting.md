# Troubleshooting

Common issues and their fixes.

## `EUNSUPPORTEDPROTOCOL: workspace:*` on `bun install`

You're on a Morph version older than 0.1.7. Earlier publishes shipped with `workspace:*` literally in their dependency lists, which only resolves inside Morph's own monorepo.

Fix:

```sh
bun update '@morphdsl/*' --latest
```

If you're using `bunx @morphdsl/cli`, ensure you're not pinning to an old version (`bunx @morphdsl/cli@0.1.6 ...` will reproduce this).

## `command not found: bun` after `bunx @morphdsl/cli`

The CLI's bin script uses `#!/usr/bin/env bun` because the runtime imports `bun:sqlite`. Install bun:

```sh
curl -fsSL https://bun.com/install | bash
```

Or via Homebrew (`brew install oven-sh/bun/bun`), Nix, your distro's package manager, etc. Then retry.

## "Route not found" on `POST /createPaste` / `GET /listPastes`

Generated routes live under `/api/...`, not at the root. The exact paths come from your schema; they're enumerated in the generated `apps/api/openapi.json`. For a paste schema you'd typically hit `/api/pastes`.

When in doubt, `cat apps/api/openapi.json | jq '.paths | keys'`.

## API returns garbage data — wrong content, weird timestamps

The handler implementations in `contexts/<context>/core/src/operations/*/impl.ts` are *scaffolds*. They use property-based test arbitraries to return well-typed but meaningless data so type-checking and request flow can be verified end-to-end before you write the real logic.

Open each `impl.ts` and replace the `// TODO: Implement` body with your business logic. The scaffold's interface and Effect signature are stable — fill them in.

## `bun run build:check` fails on `Cannot find module 'bun'`

The generated `package.json` declares `@types/bun` as a devDependency. Make sure you ran `bun install` after `new-project`. If you're inside a generated project that pre-dates 0.1.9, add it manually:

```sh
bun add -d @types/bun
```

## `bun install` fails on `@pastebin/pastes-dsl@workspace:*`

The generated monorepo's `package.json` workspaces array must include `contexts/*/dsl` and `contexts/*/core`. As of 0.1.7+ the generator emits these. If you're on an older version, regenerate:

```sh
bunx @morphdsl/cli@latest generation:new-project pastebin --schema-file pastebin.morph
```

## `regenerate:morph` fails with `magick: command not found`

Optional dependency. ImageMagick is only needed when re-deriving the VS Code marketplace icon — `scripts/build-vscode-icon.ts`. Install it (`brew install imagemagick`, `apt install imagemagick`) or skip the icon step.

## Site / playground shows old content

GitHub Pages caches via Cloudflare. Force a refresh with a query string (`?v=2`) or wait a few minutes.

## Still stuck

Open an issue at <https://github.com/willclarktech/morph/issues> with the schema (or a minimal reproduction) and the exact command output.
