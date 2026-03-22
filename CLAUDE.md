---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Project

This is a **greenfield project** — nothing has been released.

**No backward compatibility.** There are no users, no migrations, no deprecation paths. If a simpler design requires breaking changes, make them. Delete code that adds complexity for hypothetical future compatibility. YAGNI applies aggressively.

**Versioning:** All package versions start at `0.0.0`.

Morph is an auto-generation framework — operations, generators, schema DSL.

**Generated Code — NEVER EDIT DIRECTLY:**
- `examples/` — Regenerate with `bun run generate:examples`, never manually edit
- `contexts/generation/*/` — Morph's own generated packages, regenerate with `bun run regenerate:morph`
- `apps/cli/`, `apps/mcp/`, `apps/vscode/` — Generated app scaffolds
- `tests/scenarios/` — Generated test scenarios
- If generated code has errors, fix the **generator** (in `contexts/generation/`) or the **regenerate script** (`scripts/regenerate-morph.ts`), not the output
- Exception: Hand-written implementation files in `examples/fixtures/*/impls/`
- Exception: `contexts/generation/impls/` contains hand-written implementations for morph itself
- Exception: `extensions/auth-password/` is a hand-written library (not generated)

Shared:
- **config/** - ESLint and TypeScript configs
- `TODO.md` - Backlog at root
- `ARCHITECTURE.md` - Monorepo structure at root
- `docs/` - Morph documentation (DSL reference, domain schema, architecture, extensions, testing philosophy, 12-factor, design decisions)

## Scripts

Use root package.json scripts to run commands across all packages:

```sh
bun run build:check       # Type check all packages
bun run lint              # Lint all packages
bun run lint:fix          # Fix lint issues
bun run format            # Check formatting
bun run format:fix        # Fix formatting
bun generate:examples     # Regenerate example apps from schemas
```

**Full verification after significant changes:**

```sh
bun install && bun run regenerate:morph && bun run regenerate:morph && bun run generate:examples && bun run test
```

Regenerate twice to ensure idempotency.

**Task orchestration:** Turborepo handles package task orchestration with intelligent caching and 25% CPU concurrency (see `turbo.json`). This makes global commands efficient even with many packages.

For single-package work during development:

```sh
cd contexts/generation/targets/api/scenario-runner && bun run build:check  # Check one package
cd contexts/generation/targets/core/generator && bun run lint:fix          # Lint one package
```

## Git

Commit messages should be concise and descriptive. Do not include promotional footers, "Generated with" attributions, or Co-Authored-By lines.

## Workflow

After each meaningful change:
1. **Type check** — Run `bun run build:check` or use `--filter` for targeted checks
2. **Commit** — Create a focused commit with a descriptive message

After completing a task or making relevant progress:
1. **Update plans** — If a plan file exists in `~/.claude/plans/`, update or delete it
2. **Update backlog** — Mark completed items in `TODO.md`, add new items discovered

## Worktrees (Required for All Work)

**Always use a worktree for any non-trivial task.** This keeps main clean and enables parallel development.

**Starting work:**
```sh
bun run worktree:new <feature-name>   # Creates .worktrees/<name>/ with branch worktree/<name>
cd .worktrees/<feature-name>          # Work entirely within this directory
```

Each worktree has its own `node_modules/`. Multiple Claude sessions can work simultaneously on different features.

**During development:**
- Run `bun run worktree:list` to see active worktrees
- Avoid modifying shared config files (root `package.json`, `tsconfig.json`) without coordination
- Commit frequently to your branch

**Landing your work:**
Use the `/land` command to automate the merge workflow, or manually:
1. Ensure all changes are committed
2. Run `bun run build:check` to verify
3. From the main worktree: `git merge --ff-only worktree/<feature-name>`
4. Clean up: `bun run worktree:remove <feature-name>`
5. Update `TODO.md` with completed items

**Do not merge your own branch without user confirmation.**

## Programming Principles

**Philosophy:**
- Constraints are good — prefer strictness, fail fast
- Make illegal states unrepresentable
- Parse, don't validate — transform at boundaries, trust types thereafter

**TypeScript:**
- No `any`, no type assertions in production code (tests may relax)
- No `null` — use `undefined` exclusively
- No enums — use string literal unions
- Branded types for domain identifiers (`type UserId = string & { __brand: 'UserId' }`)
- Exhaustiveness checking with `never`
- Arrow functions over function declarations
- No file extensions in imports: `from "./foo"` not `from "./foo.ts"`
- Folder paths for barrels: `from "./services"` not `from "./services/index"`
- No lazy loading (`require()` or dynamic `import()`) unless there's a concrete, documented reason (e.g., circular dependency, optional peer dependency). Use static imports by default.

**Exports:**
- No re-exports from other packages — consumers import directly from source
  - Exception: Generated packages may re-export from fixture packages (e.g., @morph/core re-exports from @morph/impls)
- Barrel files use `export * from "./module"` for internal modules, not named exports
- Exception: A package may use named exports from internal modules if intentionally hiding implementation details

**Design:**
- Composition over inheritance
- Dependency injection — explicit dependencies, no globals
- Semantic modules — organize by domain, not technical layer
- Minimal public API — unexported by default
- Comments are a code smell — only for essential context or external docs (docstrings on public APIs are fine)

**Functional:**
- Pure functions, immutable data
- Effects at the edges — pure core, impure shell
- Total functions — return values, don't throw

**Testing:**
- Strict in source, relaxed in tests
- Test behavior, not implementation
- Property-based testing for invariants

**Tooling:**
- Don't think about formatting — use auto-formatters (Prettier, rustfmt, gofmt) with defaults
- Tabs for indentation, spaces for alignment (unless language norms override)
- Every project needs `.editorconfig` for consistent whitespace
- Use CLI commands for package management, never edit lockfiles directly
- **Always run `lint:fix` and `format:fix` before attempting manual fixes** — let the tools do the work
- **Inline eslint-disable sparingly** — OK for genuine exceptions with a comment explaining why; not for laziness or as substitute for updating the global config

**Observability:**
- Structured logs over printf debugging — logs are data, not text
- Use Effect logging: `Effect.logDebug`, `Effect.logInfo`, `Effect.logError`
- Annotate logs with context: `Effect.annotateLogs({ userId, requestId })`
- Add spans for timing: `Effect.withLogSpan("operationName")`
- Never log secrets, PII, or tokens

## File Structure

**File size limits:**
- Target: <500 lines per file
- Split files approaching 800+ lines
- Never let files exceed 1000 lines

**Avoid types.ts files:**
- Types isolated in `types.ts` are a code smell
- Define types alongside their runtime colleagues in semantically appropriate modules
- Exception: Effect Schema files are inherently type definitions

**Interface + implementations pattern:**
For pluggable backends (storage, auth, events):
- `index.ts` — Interface definition + registry
- `<impl>.ts` — Each implementation in its own file
- Matches runtime pattern: interface → multiple backends

**Generic + customization pattern:**
For generators that produce similar output (Dockerfiles, package.json):
- `index.ts` — Generic builder with customization hooks
- `<variant>.ts` — Variant-specific configuration
- Avoids duplication while allowing specialization

**Utility extraction:**
- Duplicated utilities go to shared packages (`@morph/utils`)
- Never copy utility functions between files
- If you find yourself copying, extract instead

**Package exports:**
- Avoid subpath exports (e.g., `"./foo": "./src/foo.ts"`)
- Either export everything from the main entrypoint (`".": "./src/index.ts"`)
- Or create separate packages if the concern is truly distinct
- Subpath exports fragment the API surface and complicate imports
