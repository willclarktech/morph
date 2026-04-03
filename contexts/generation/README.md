# Generation Context

The core of Morph's code generation pipeline. Transforms a parsed `DomainSchema` into runnable packages across 13 targets.

## Pipeline

```
schema.morph → parser → DomainSchema → plugins → generators → output files
```

1. **Schema DSL** (`contexts/schema-dsl/`) parses `.morph` text into a `DomainSchema` JSON structure
2. **Plugins** register generators for each target (api, cli, ui, etc.)
3. **Generators** produce output files — TypeScript source, configs, HTML, protobuf definitions
4. **Builders** provide reusable scaffolding (package.json, Dockerfile, test harness, README)

## Directory Structure

```
contexts/generation/
├── domain-schema/     # DomainSchema types and parsing utilities
├── plugin/            # Plugin system — interface, registry, helpers
├── operation/         # Operation descriptors and metadata
├── targets/           # 13 generation targets (see below)
│   ├── api/           #   REST API with OpenAPI, SSE, auth middleware
│   ├── cli/           #   Interactive REPL and one-off commands
│   ├── cli-client/    #   CLI that calls the API remotely
│   ├── client/        #   Type-safe HTTP client library
│   ├── core/          #   Handler interfaces, repositories, DI layers
│   ├── dsl/           #   Branded IDs, Effect schemas, descriptors
│   ├── impls/         #   Handler scaffolds (the only files users edit)
│   ├── mcp/           #   MCP server exposing operations as LLM tools
│   ├── monorepo/      #   Root configs, Procfile, workspace setup
│   ├── proto/         #   Protocol buffer definitions
│   ├── ui/            #   Server-rendered web UI (Pico CSS)
│   ├── verification/  #   SMT-LIB2 formal verification (Z3)
│   └── vscode/        #   VS Code extension with DSL support
├── builders/          # Reusable output builders
│   ├── app/           #   App-level scaffolding (entrypoints, Procfile)
│   ├── readme/        #   Generated README files
│   ├── scaffold/      #   Package scaffolding (package.json, tsconfig)
│   └── test/          #   Test harness generation
├── generators/        # Cross-cutting generators shared across targets
│   ├── contracts/     #   Backend contract test generation
│   ├── diagrams/      #   Architecture diagram generation
│   ├── env/           #   Environment variable configs
│   ├── openapi/       #   OpenAPI spec generation
│   ├── properties/    #   Property-based test generation
│   ├── scenarios/     #   BDD scenario generation
│   ├── types/         #   Shared type generation
│   └── ui-mappings/   #   UI field mapping generation
├── testing/           # Test infrastructure
│   ├── scenario/      #   Scenario definition and parsing
│   ├── scenario-runner/ # Shared scenario runner
│   ├── property/      #   Property test definitions
│   ├── property-runner/ # Shared property runner
│   └── testing/       #   Test utilities
├── dsl/               # Morph's own generated DSL package
├── core/              # Morph's own generated core package
├── impls/             # Hand-written implementations for Morph itself
├── http-client/       # Shared HTTP client for generated API clients
└── utils/             # Internal utilities
```

## Key Concepts

**Targets** — each target produces a distinct package type (API server, CLI, client library, etc.). A target has a generator (produces files), a plugin (registers with the pipeline), and optionally a scenario-runner and property-runner for testing.

**Plugins** — implement the `GeneratorPlugin` interface (`plugin/src/interface.ts`). Plugins register generators that receive a `DomainSchema` and produce file output. The plugin registry orchestrates execution order.

**Builders** — reusable scaffolding shared across targets. The app builder creates entrypoints and Procfiles, the scaffold builder creates package.json and tsconfig, etc.

**Generators** — cross-cutting concerns that multiple targets need. OpenAPI specs, type definitions, scenario tests, and property tests are generated centrally rather than duplicated per target.

## Navigating the Code

Recommended reading order:

1. `domain-schema/` — understand the `DomainSchema` type that all generators consume
2. `plugin/src/interface.ts` — the `GeneratorPlugin` contract
3. `targets/dsl/` — simplest target, generates types and schemas
4. `targets/core/` — the core target, generates handler interfaces and repositories
5. `targets/api/` — a full app target with routing, middleware, OpenAPI
6. `builders/` — how scaffolding is shared across targets
7. `generators/` — cross-cutting generators

## Related Docs

- [Source Tour](../../docs/architecture/tour.md) — guided walkthrough from schema to generated output
- [Architecture](../../docs/architecture/overview.md) — monorepo structure and workspace layout
- [Testing Philosophy](../../docs/concepts/testing-philosophy.md) — how scenarios verify algebraic laws
