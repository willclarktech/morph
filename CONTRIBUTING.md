# Contributing to Morph

Morph dogfoods itself — its own CLI, MCP server, and VS Code extension are generated from [`schema.morph`](schema.morph). Most contribution workflows start with editing that root schema and regenerating.

## Prerequisites

- [Bun](https://bun.com/install)
- Git
- [ImageMagick](https://imagemagick.org/) (optional — `scripts/build-vscode-icon.ts` re-derives the marketplace icon from `docs/images/logo.png`)
- [Z3](https://github.com/Z3Prover/z3) (optional — only needed for formal verification target)

```sh
git clone <repo-url> && cd morph
bun install
bun run build:check   # verify the build works
```

## The dogfooding model

Morph's root `schema.morph` defines two contexts — `generation` (the code generation operations) and `schema-dsl` (the parser and language services). Running `bun run regenerate:morph` produces Morph's own DSL types, core handlers, CLI, MCP server, and VS Code extension from this schema.

The typical contribution loop:

1. Edit `schema.morph` (add operations, types, contexts)
2. Regenerate: `bun run regenerate:morph`
3. Implement handlers in `contexts/generation/impls/` or `contexts/schema-dsl/impls/`
4. Verify: `bun run build:check && bun run lint:fix && bun run format:fix && bun run test`

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
bun run regenerate:morph && bun run regenerate:morph && bun run generate:examples && bun run format:fix && bun run lint:fix && bun run build:check && bun run test && bun install
```

Regenerate twice to confirm idempotency. The final `bun install` ensures the workspace is consistent after any generated package.json changes.

## Generated vs hand-written

Most code in this repo is generated. Do not edit generated code — fix the generator or schema instead.

**Generated (do not edit):**
- `examples/` — regenerate with `bun run generate:examples`
- `contexts/generation/{dsl,core}/` — regenerate with `bun run regenerate:morph`
- `contexts/schema-dsl/{dsl,core}/` — regenerate with `bun run regenerate:morph`
- `apps/cli/`, `apps/mcp/`, `apps/vscode/` — generated app scaffolds
- `tests/scenarios/` — generated test scenarios
- `extensions/*/dsl/` — generated extension types

**Hand-written:**
- `schema.morph` — the root schema that drives everything
- `contexts/generation/impls/` — Morph's own operation implementations
- `contexts/schema-dsl/impls/` — DSL parser and language service implementations
- `contexts/schema-dsl/parser/`, `compiler/`, `decompiler/` — DSL toolchain
- `extensions/*/impls/` — extension backend implementations
- `extensions/auth-password/` — password hashing library
- `examples/fixtures/*/impls/` — example app business logic

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

## Further reading

- **[Source Tour](docs/architecture/tour.md)** — Guided walkthrough of key source files, from schema to generated output
- **[Contexts Structure](docs/architecture/contexts.md)** — Context-centric package organization
- **[CLAUDE.md](CLAUDE.md)** — Coding conventions, programming principles, tooling preferences
