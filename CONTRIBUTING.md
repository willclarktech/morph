# Contributing to Morph

Practical guide to working on the Morph codebase.

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Z3](https://github.com/Z3Prover/z3) (optional — only needed for formal verification target)
- Git

```sh
git clone <repo-url> && cd morph
bun install
bun run build:check   # verify the build works
```

## Worktree workflow

All non-trivial work happens in worktrees to keep `main` clean:

```sh
bun run worktree:new <feature-name>     # creates .worktrees/<name>/ on branch worktree/<name>
cd .worktrees/<feature-name>            # work entirely here
# ... make changes, commit frequently ...
bun run build:check                     # verify before landing
```

To land work, from the main worktree:

```sh
git merge --ff-only worktree/<feature-name>
bun run worktree:remove <feature-name>
```

## Key commands

| Command | Purpose |
|---------|---------|
| `bun run build:check` | Type check all packages |
| `bun run lint:fix` | Fix lint issues |
| `bun run format:fix` | Fix formatting |
| `bun run test` | Run all tests |
| `bun run generate:examples` | Regenerate example apps from schemas |
| `bun run regenerate:morph` | Regenerate Morph's own packages from `schema.morph` |

Full verification after significant changes:

```sh
bun install && bun run regenerate:morph && bun run regenerate:morph && bun run generate:examples && bun run test
```

Regenerate twice to confirm idempotency.

## How to add a generation target

Each target lives under `contexts/generation/targets/<name>/` with up to four sub-packages:

| Sub-package | Purpose |
|-------------|---------|
| `generator/` | Produces output files from `DomainSchema` |
| `plugin/` | Implements `GeneratorPlugin` — hooks into the generation pipeline |
| `scenario-runner/` | Runs BDD scenarios against the generated target |
| `property-runner/` | Runs property-based tests against the generated target |

Steps:

1. Create the target directory under `contexts/generation/targets/<name>/`
2. Implement a `GeneratorPlugin` (see `contexts/generation/plugin/src/interface.ts`)
3. Register the plugin in the plugin registry
4. Add workspace globs to the root `package.json`
5. Add a scenario-runner if the target is testable via scenarios

Look at an existing target (e.g., `targets/api/`) as a reference.

## How to add an extension

Extensions live under `extensions/<category>-<backend>/` with two sub-packages:

| Sub-package | Purpose |
|-------------|---------|
| `dsl/` | Generated types and schemas — do not edit directly |
| `impls/` | Hand-written implementation |

Steps:

1. Create `extensions/<category>-<backend>/` with `dsl/` and `impls/` directories
2. Add a `schema.morph` file defining the extension's interface
3. Implement the backend in `impls/`
4. Register the extension in its category's interface package (e.g., `extensions/storage/`)

See existing extensions (e.g., `extensions/storage-sqlite/`) for the standard layout.

## Testing

Morph uses several testing strategies:

- **Scenario tests** — BDD-style given/when/then specs that run against multiple targets (@core, @api, @cli). If core passes but API fails, the natural transformation has a bug.
- **Property tests** — Verify algebraic invariants hold across random inputs.
- **Contract tests** — Ensure storage and auth backends conform to their interfaces.
- **Formal verification** — Z3 SMT-LIB2 proofs for domain invariants (requires Z3).

Run all tests: `bun run test`

## Generated vs hand-written

Most code in this repo is generated. Do not edit generated code — fix the generator instead.

**Generated (do not edit):**
- `examples/` — regenerate with `bun run generate:examples`
- `contexts/generation/*/` (except `impls/`) — regenerate with `bun run regenerate:morph`
- `apps/cli/`, `apps/mcp/`, `apps/vscode/` — generated app scaffolds
- `tests/scenarios/` — generated test scenarios

**Hand-written:**
- `contexts/generation/impls/` — Morph's own operation implementations
- `examples/fixtures/*/impls/` — example app business logic
- `extensions/auth-password/` — password hashing library
- `extensions/*/impls/` — extension backend implementations

## Further reading

- **[Source Tour](docs/tour.md)** — Guided walkthrough of key source files, from schema to generated output
- **[Architecture](docs/architecture.md)** — Monorepo structure and package organization
- **[CLAUDE.md](CLAUDE.md)** — Coding conventions, programming principles, tooling preferences
