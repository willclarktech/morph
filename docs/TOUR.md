# Morph Source Tour

A guided walkthrough of key source files in the morph generation framework. Follow this tour to understand how a `.morph` schema becomes a running application.

## 1. Schema Definition

Start here. The `.morph` DSL is the user-facing entry point.

**`examples/fixtures/todo-app/schema.morph`** — The most complete example schema. Defines entities (Todo, User), operations (commands, queries), invariants, events, subscribers, and extension configuration.

**`examples/fixtures/pastebin-app/schema.morph`** — A simpler example. Single entity, no auth, no invariants. Good for understanding the minimal schema.

## 2. DSL Parsing

The `.morph` text is parsed into an AST, then compiled to the `DomainSchema` JSON format.

**`contexts/schema-dsl/parser/src/lexer.ts`** — Tokenizer. Defines all keywords (`domain`, `context`, `entity`, `command`, `query`, etc.), operators, and token categories.

**`contexts/schema-dsl/parser/src/parser.ts`** — Grammar rules. A Chevrotain CstParser with recovery enabled. Defines the structure: domain → extensions → contexts → entities/operations/invariants.

**`contexts/schema-dsl/parser/src/ast.ts`** — AST node types. Every node carries a `SourceRange` for position tracking. The type hierarchy: `DomainAst` → `ContextAst` → `EntityAst`/`CommandAst`/`QueryAst`/etc.

**`contexts/schema-dsl/parser/src/visitor.ts`** — Converts Chevrotain's CST (concrete syntax tree) into the semantic AST defined in `ast.ts`.

**`contexts/schema-dsl/compiler/src/compiler.ts`** — Compiles the AST into `DomainSchema` JSON. This is the bridge between the DSL world and the generation pipeline.

## 3. Domain Schema

The canonical intermediate representation. All generators read from this format.

**`libs/domain-schema/src/schema.ts`** — TypeScript types for `DomainSchema`, `ContextDef`, `EntityDef`, `OperationDef`, etc. The "theory T" in the algebraic model.

**`libs/domain-schema/src/analysis.ts`** — Schema query functions: `findPrimaryContext`, `getContextsWithTag`, `getContextOperationsWithTag`, `hasPropertyTests`. Used by all generators and plugins.

## 4. Generation Pipeline

The orchestrator. Takes a `DomainSchema` and produces a complete monorepo.

**`scripts/regenerate-morph.ts`** — The 14-step pipeline that regenerates morph's own packages from `schema.morph`. Steps include: parse DSL → compile → validate → generate DSL packages → generate core packages → generate apps → lint:fix → format:fix. The authoritative reference for generation order.

**`contexts/generation/plugin/src/index.ts`** — The `GeneratorPlugin` interface. Each target (api, cli, mcp, etc.) implements `generate(ctx: PluginContext) → GeneratedFile[]`.

**`contexts/generation/builders/app/src/index.ts`** — The `buildApp` function. Shared builder for all app targets: package.json, Dockerfile, .env.example, config files. Plugins call this to generate the app scaffold.

## 5. Generator Targets

Each target is a plugin that generates a specific type of application.

**`contexts/generation/targets/core/generator/src/`** — The most complex generator. Produces handler interfaces, repository adapters, layer composition, mock implementations, and scenario test harnesses.

**`contexts/generation/targets/api/generator/src/`** — Generates REST API server. Routes, OpenAPI spec, SSE event streaming, auth middleware, handler wiring.

**`contexts/generation/targets/cli/generator/src/`** — Generates CLI application. REPL mode, one-off commands, arg parsing, backend selection.

**`contexts/generation/targets/mcp/generator/src/`** — Generates MCP server for LLM tool integration. Tool definitions, input schemas, handler registration.

**`contexts/generation/targets/dsl/generator/src/`** — Generates the DSL package: typed schemas, branded IDs, operation descriptors (`defineOp`), arbitraries.

## 6. Type Generators

The shared generators that produce TypeScript types, schemas, and related code.

**`contexts/generation/generators/types/src/generators/schemas.ts`** — Generates Effect Schema definitions from entity/value object definitions. Branded IDs, parse/encode helpers, event schemas.

**`contexts/generation/generators/types/src/generators/errors.ts`** — Generates tagged error classes. Supports inline errors (message-only) and context-level errors (typed fields).

**`contexts/generation/generators/types/src/generators/ports.ts`** — Generates hexagonal architecture port interfaces. Method signatures returning `Effect.Effect`, Context tags for DI.

**`contexts/generation/generators/types/src/mappers/type-reference.ts`** — Maps `TypeRef` (schema format) to TypeScript source strings. The universal type-to-code converter.

## 7. Runtime Libraries

These are imported by generated applications at runtime (not build-time generators).

**`contexts/generation/runtime/api/src/index.ts`** — `createApi()` factory. Configures the HTTP server with routes, auth, SSE, and handler layers.

**`contexts/generation/runtime/cli/src/index.ts`** — `createCli()` factory. REPL mode, command parsing, backend resolution, config management.

**`contexts/generation/runtime/mcp/src/index.ts`** — `createMcp()` factory. MCP server setup with tool registration and handler forwarding.

## 8. Extensions

Infrastructure backends declared in the schema's `extensions` block.

**`extensions/storage/dsl/src/schemas.ts`** — The `StorageTransport` port interface (get, put, remove, getAll). All storage backends implement this.

**`extensions/storage-memory/impls/src/`** — In-memory storage implementation. The simplest backend — `Ref<Map>` behind the port interface.

**`extensions/storage-sqlite/impls/src/`** — SQLite storage. Bun's built-in `bun:sqlite` behind the same `StorageTransport` interface.

**`extensions/auth/dsl/src/schemas.ts`** — Auth ports: `AuthProvider` and `PasswordHasher`. Backends: none, inmemory, jwt, session, apikey, password.

## 9. Scenario Testing

Behavior tests that work across all application targets.

**`libs/scenario/src/`** — The scenario DSL: `scenario()`, `given()`, `when()`, `then()`, `assert()`. Data structures representing BDD steps.

**`libs/operation/src/`** — `defineOp<Input, Output>()` creates typed operation descriptors. Operations are the "free algebra" — structure without implementation.

**`libs/scenario-runner/src/`** — Shared `createRunner`/`runScenario` infrastructure. Each transport (core, api, cli, mcp) provides only the `execute` function; all scenario running logic is shared.

**`contexts/generation/targets/core/scenario-runner/src/`** — The core (in-process) runner. Creates an Effect runtime with layers, executes operations directly against handlers. The reference implementation that all other runners must match.

## 10. Contract Tests

Property-based tests that verify backend implementations satisfy port interfaces.

**`tests/contracts/src/storageTransport.test.ts`** — Generated. Tests memory, jsonfile, and sqlite backends against `StorageTransport` laws using fast-check.

**`contexts/generation/generators/contracts/src/index.ts`** — The contract test generator. Reads port contracts from schemas, generates fast-check property test harnesses.

## 11. Examples

Generated example applications that demonstrate the full system. Each is generated from `fixtures/<name>/schema.morph`.

### Minimal

**`examples/pastebin-app/`** — Single entity, no auth. The simplest possible schema. Referenced by the getting-started guide.

**`examples/cache-port/`** — No entities. Abstract port interface with generic methods, property-based contracts, and a standalone function.

**`examples/type-gallery/`** — No entities. Generics (`Pair<A, B>`), discriminated unions (`Result<T, E>`), type aliases, and pure functions.

### Small

**`examples/address-book/`** — Value objects (`value Address`), standalone errors with typed fields, `@sensitive` annotation.

**`examples/code-generator/`** — Pure transformation domain. Discriminated unions, value objects, functions — no entities or CRUD.

### Medium

**`examples/marketplace/`** — Multiple contexts (`catalog`, `orders`) with `depends on`, cross-context type references, and `profiles { web: @cli @mcp }`.

**`examples/delivery-tracker/`** — Entity relationships (`has_one`, `references`), post conditions on commands, invariants.

**`examples/blog-app/`** — Role-based auth, domain events with subscribers, multiple storage backends, JWT authentication.

**`examples/ledger/`** — Event-sourced storage backend. Account balance derived from transaction history. Demonstrates `eventsourced` storage with `eventStore` extension, `getByAggregateId` queries, and event-enriched `aggregateId`/`version` fields.

### Full-featured

**`examples/todo-app/`** — Auth, multi-entity, invariants, events, subscribers, i18n, scenarios, all five app targets. The flagship example.

### Fixtures

**`examples/fixtures/*/impls/`** — Hand-written handler implementations. The **only** code a user writes. Everything else is generated.

## Reading Order

For understanding the system end-to-end:

1. Read `examples/fixtures/pastebin-app/schema.morph` (the simplest schema)
2. Read `contexts/schema-dsl/parser/src/ast.ts` (what the parser produces)
3. Read `libs/domain-schema/src/schema.ts` (the canonical format)
4. Read `scripts/regenerate-morph.ts` (how generation is orchestrated)
5. Read `contexts/generation/targets/dsl/generator/src/` (simplest generator)
6. Read `contexts/generation/targets/core/generator/src/` (most complex generator)
7. Read `examples/pastebin-app/` (the generated output)

For exploring specific features, read the fixture schemas in order of complexity: `cache-port` → `type-gallery` → `address-book` → `marketplace` → `delivery-tracker` → `blog-app` → `todo-app`.
