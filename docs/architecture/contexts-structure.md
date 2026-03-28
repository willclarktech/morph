# Contexts Structure

This document explains the context-centric package organization used in morph and generated projects.

## Overview

Morph organizes code by **bounded contexts** - each domain area gets its own directory containing related packages. This mirrors Domain-Driven Design principles where each context is autonomous and self-contained.

## Per-Context Package Structure

Each context generates up to three package types:

```
contexts/{context-name}/
├── dsl/                     # Types, schemas, errors
├── core/                    # Operations, handlers, services
└── impls/                   # Hand-written implementations (optional)
```

### DSL Package (`dsl/`)

Contains domain types and schemas (100% generated):

- `schemas.ts` - Effect Schema definitions for entities and value objects
- `errors.ts` - Domain error types
- `events.ts` - Domain event types (if events defined)
- `arbitraries.ts` - fast-check arbitraries for property testing

Package name: `@{scope}/{context}-dsl`

### Core Package (`core/`)

Contains business logic (mostly generated, with re-exports from impls):

- `operations/` - Operation definitions with handlers
  - `{operation}/index.ts` - Operation definition
  - `{operation}/handler.ts` - Handler interface (Context.Tag)
  - `{operation}/impl.ts` - Real implementation (from impls/ fixtures)
  - `{operation}/mock-impl.ts` - Mock implementation for testing
  - `{operation}/impl.template.ts` - Template for custom implementations
- `services/` - Repository interfaces and implementations
- `subscribers/` - Event subscribers (if events defined)
- `invariants/` - Domain invariant validators (if invariants defined)
- `layers.ts` - Layer compositions (InMemoryLayer, etc.)
- `prose.ts` - Re-exports prose from impls
- `text.ts` - Re-exports text catalog from impls (if i18n configured)
- `test/scenarios.test.ts` - Scenario tests
- `test/properties.test.ts` - Property tests (if invariants defined)

Package name: `@{scope}/{context}-core`

### Impls Package (`impls/`)

Hand-written implementations and fixtures. This is the only place for hand-written context code:

**Handler implementations:**
Structure mirrors `core/operations/`:
```
impls/{operation}.ts  →  core/src/operations/{operation}/impl.ts
```

**Fixtures (prose and text):**
- `prose.ts` - Human-readable templates for test output and feature files
- `text.ts` - Text catalog with translations for UI

These fixtures are re-exported from core, so consumers import from core, not impls:

```typescript
// ✅ Correct - import fixtures from core
import { prose } from "@my-app/tasks-core";

// ❌ Wrong - never import from impls directly
import { prose } from "@my-app/tasks-impls";
```

**Important:** The impls package is an internal implementation detail. Users should never import from impls directly. All functionality is exposed through operations in the core package:

```typescript
// ✅ Correct - use operations via ops namespace
import { ops, HandlersLayer } from "@my-app/tasks-core";

const result = await Effect.runPromise(
  ops.createTask.execute({ title: "Buy milk" }, {}).pipe(
    Effect.provide(HandlersLayer)
  )
);

// ❌ Wrong - never import from impls directly
import { createTask } from "@my-app/tasks-impls";
```

This ensures:
1. A consistent public API surface where core is the single entry point
2. Operations are always executed through the Effect layer system
3. Implementation details (impls) remain internal

## Generated Project Structure

A generated project follows this layout:

```
{project}/
├── contexts/                # Domain contexts
│   └── {context}/
│       ├── dsl/             # @{scope}/{context}-dsl
│       └── core/            # @{scope}/{context}-core
├── apps/                    # Application targets
│   ├── api/                 # REST API
│   ├── cli/                 # Command-line interface
│   ├── mcp/                 # MCP server
│   └── ui/                  # Web UI
├── libs/                    # Shared libraries
│   └── client/              # API client
├── tests/                   # Cross-cutting tests
│   ├── scenarios/           # Scenario definitions
│   └── properties/          # Property definitions
├── docs/                    # Generated documentation
├── config/                  # Shared config (tsconfig, eslint)
└── schema.json              # Domain schema (includes extensions config)
```

## Morph's Own Structure

Morph dogfoods itself. Its schema defines two contexts: `generation` (code generation operations) and `schema-dsl` (schema parsing, compilation, and decompilation). Auth and storage are not contexts -- they are extensions that live in a separate directory.

```
morph/
├── contexts/
│   ├── generation/              # Code generation context
│   │   ├── dsl/                 # @morph/generation-dsl
│   │   ├── core/                # @morph/generation-core
│   │   ├── impls/               # Hand-written generation implementations
│   │   │
│   │   ├── targets/             # Generation targets
│   │   │   ├── api/
│   │   │   ├── cli/
│   │   │   ├── mcp/
│   │   │   ├── ui/
│   │   │   ├── dsl/
│   │   │   ├── core/
│   │   │   ├── client/
│   │   │   └── monorepo/
│   │   │
│   │   ├── builders/            # Code builders
│   │   │   ├── app/
│   │   │   ├── readme/
│   │   │   ├── test/
│   │   │   └── scaffold/
│   │   │
│   │   ├── generators/          # Cross-cutting generators
│   │   │   ├── types/
│   │   │   ├── openapi/
│   │   │   ├── diagrams/
│   │   │   └── ...
│   │   │
│   │   └── plugin/              # Plugin system
│   │
│   └── schema-dsl/              # Schema DSL context
│       ├── dsl/                 # @morph/schema-dsl-dsl
│       ├── core/                # @morph/schema-dsl-core
│       ├── impls/               # Hand-written schema-dsl implementations
│       ├── compiler/            # Schema compiler
│       ├── decompiler/          # Schema decompiler
│       └── parser/              # Schema parser
│
└── extensions/                  # Infrastructure extensions
    ├── auth-password/           # Password hashing
    │   ├── dsl/                 # @morph/auth-password-dsl
    │   └── impls/               # @morph/auth-password-impls
    ├── auth-session/            # Session management
    ├── storage-memory/          # In-memory storage
    ├── storage-jsonfile/        # JSON file storage
    ├── storage-sqlite/          # SQLite storage
    ├── storage-redis/           # Redis storage
    └── ...
```

The `generation` context is special because it contains both:
1. Generated packages (`dsl/`, `core/`) from morph's own schema
2. Generation infrastructure (`targets/`, `builders/`, `generators/`, `plugin/`)

The `schema-dsl` context handles parsing `.morph` schema files, compiling them to the internal representation, and decompiling back. It also contains generated packages (`dsl/`, `core/`) plus domain-specific tooling (`compiler/`, `decompiler/`, `parser/`).

Extensions are not contexts -- they provide reusable infrastructure (auth providers, storage backends) that generated projects can opt into via the `extensions` field in their domain schema. Extension packages use `@morph/{name}-dsl` and `@morph/{name}-impls` naming (not `-core`).

## Related Documentation

- [Libs vs Contexts Architecture](./libs-vs-modules.md) - When to use libs vs contexts
- [Domain Schema](./domain-schema.md) - Schema definition format
- [Architecture Overview](./overview.md) - High-level morph architecture
