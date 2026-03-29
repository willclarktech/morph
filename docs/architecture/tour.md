# Morph Source Tour

A guided walkthrough of key source files. Follow this to understand how a `.morph` schema becomes a running application.

## 1. Schema Definition

Start here. The `.morph` DSL is the user-facing entry point.

**`examples/fixtures/todo-app/schema.morph`** — The most complete example schema. Entities, operations, invariants, events, subscribers, extension config.

**`examples/fixtures/pastebin-app/schema.morph`** — The simplest example. Single entity, no auth, no invariants.

## 2. DSL Parsing

The `.morph` text is parsed into an AST, then compiled to `DomainSchema` JSON.

**`contexts/schema-dsl/parser/src/lexer.ts`** — Tokenizer. All keywords, operators, and token categories.

**`contexts/schema-dsl/parser/src/parser.ts`** — Grammar rules (Chevrotain CstParser). Structure: domain → metadata → extensions → profiles → contexts.

**`contexts/schema-dsl/parser/src/ast.ts`** — AST node types. Every node carries `SourceRange`. Hierarchy: `DomainAst` → `ContextAst` → `EntityAst`/`CommandAst`/`QueryAst`/etc.

**`contexts/schema-dsl/parser/src/visitor.ts`** — Converts Chevrotain CST into the semantic AST.

**`contexts/schema-dsl/compiler/src/index.ts`** — Compiles AST into `DomainSchema` JSON. The bridge between DSL and generation pipeline.

## 3. Domain Schema

The canonical intermediate representation. All generators read from this.

**`contexts/generation/domain-schema/src/schemas/`** — Effect Schema definitions for `DomainSchema`, `ContextDef`, `EntityDef`, `OperationDef`, etc. Split across `operations.ts`, `entities.ts`, `primitives.ts`, `expressions.ts`.

**`contexts/generation/domain-schema/src/helpers/context-queries.ts`** — Schema query functions: `findPrimaryContext`, `getContextsWithTag`, `getContextOperationsWithTag`. Used by all generators and plugins.

## 4. Generation Pipeline

Takes a `DomainSchema` and produces a complete monorepo.

**`scripts/regenerate-morph.ts`** — The pipeline that regenerates morph's own packages from `schema.morph`. Parse DSL → compile → generate → fix package.json/tsconfig/eslint → write impls re-exports → sort imports → install → format. The authoritative reference for generation order.

**`contexts/generation/plugin/src/interface.ts`** — The `GeneratorPlugin` interface. Each target implements `generate(ctx: PluginContext) → GeneratedFile[]`.

**`contexts/generation/builders/app/src/pipeline.ts`** — The `generateAppFiles` function. Shared builder for all app targets: package.json, Dockerfile, .env.example, config files.

## 5. Generator Targets

Each target is a plugin that generates a specific type of output.

**`contexts/generation/targets/core/generator/src/`** — The most complex generator. Handler interfaces, repository adapters, layer composition, mock implementations, scenario test harnesses.

**`contexts/generation/targets/api/generator/src/`** — REST API server. Routes, OpenAPI spec, SSE event streaming, auth middleware.

**`contexts/generation/targets/cli/generator/src/`** — CLI application. REPL mode, one-off commands, arg parsing, backend selection.

**`contexts/generation/targets/mcp/generator/src/`** — MCP server. Tool definitions, input schemas, handler registration.

**`contexts/generation/targets/dsl/generator/src/`** — DSL package: typed schemas, branded IDs, operation descriptors, arbitraries.

## 6. Type Generators

Shared generators that produce TypeScript types, schemas, and related code.

**`contexts/generation/generators/types/src/generators/schemas.ts`** — Effect Schema definitions from entity/value object definitions. Branded IDs, parse/encode helpers, event schemas.

**`contexts/generation/generators/types/src/generators/errors.ts`** — Tagged error classes. Inline errors (message-only) and context-level errors (typed fields).

**`contexts/generation/generators/types/src/generators/ports.ts`** — Hexagonal port interfaces. Method signatures returning `Effect.Effect`, Context tags for DI.

**`contexts/generation/generators/types/src/mappers/type-reference.ts`** — Maps `TypeRef` to TypeScript source strings. The universal type-to-code converter.

## 7. Extensions

Infrastructure backends declared in the schema's `extensions` block.

**`extensions/storage/dsl/src/ports.ts`** — The `StorageTransport` port interface (get, put, remove, getAll). All storage backends implement this.

**`extensions/storage-memory/impls/src/`** — In-memory storage. The simplest backend — `Ref<Map>` behind the port interface.

**`extensions/storage-sqlite/impls/src/`** — SQLite storage. Bun's built-in `bun:sqlite` behind the same interface.

**`extensions/auth/dsl/src/ports.ts`** — Auth port interfaces. Backends: none, jwt, session, apikey, password.

## 8. Scenario Testing

Behavior tests that work across all application targets.

**`contexts/generation/testing/scenario/src/`** — The scenario DSL: `scenario()`, `given()`, `when()`, `then()`, `assert()`.

**`contexts/generation/operation/src/`** — `defineOp<Input, Output>()` creates typed operation descriptors. Operations as data — structure without implementation.

**`contexts/generation/testing/scenario-runner/src/`** — Shared `createRunner`/`runScenario` infrastructure. Each transport (core, api, cli, mcp) provides only the `execute` function; all scenario logic is shared.

**`contexts/generation/targets/core/scenario-runner/src/`** — The core (in-process) runner. Creates an Effect runtime with layers, executes operations directly against handlers. The reference implementation.

## 9. Contract Tests

Property-based tests that verify backend implementations satisfy port interfaces.

**`tests/contracts/src/storageTransport.test.ts`** — Generated. Tests memory, jsonfile, and sqlite backends against `StorageTransport` laws using fast-check.

**`contexts/generation/generators/contracts/src/index.ts`** — The contract test generator. Reads port contracts from extension schemas, generates fast-check property test harnesses.

## 10. Examples

Generated from `fixtures/<name>/schema.morph`. Listed by complexity:

- **`cache-port`** — No entities. Abstract port with generic methods, property-based contracts.
- **`type-gallery`** — No entities. Generics, discriminated unions, type aliases, pure functions.
- **`pastebin-app`** — Single entity, no auth. The simplest CRUD app.
- **`address-book`** — Value objects, standalone errors with typed fields, `@sensitive`.
- **`ledger`** — Event-sourced storage. Balance from transaction history.
- **`code-generator`** — Pure transformation domain. No entities or CRUD.
- **`marketplace`** — Multiple contexts with `depends on`, cross-context refs, profiles.
- **`delivery-tracker`** — Entity relationships, post conditions, invariants.
- **`blog-app`** — Role-based auth, domain events, subscribers, JWT.
- **`todo-app`** — Full-featured: auth, multi-entity, invariants, events, i18n, all app targets.

Hand-written handler implementations live in **`examples/fixtures/*/impls/`** — the only code a user writes.

## Reading Order

1. `examples/fixtures/pastebin-app/schema.morph` (simplest schema)
2. `contexts/schema-dsl/parser/src/ast.ts` (what the parser produces)
3. `contexts/generation/domain-schema/src/schemas/operations.ts` (the canonical format)
4. `scripts/regenerate-morph.ts` (how generation is orchestrated)
5. `contexts/generation/targets/dsl/generator/src/` (simplest generator)
6. `contexts/generation/targets/core/generator/src/` (most complex generator)
7. `examples/pastebin-app/` (the generated output)
