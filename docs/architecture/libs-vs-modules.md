# Libs vs Contexts Architecture

This document explains the distinction between `libs/` and `contexts/` in the morph codebase and provides guidance on when to use each.

## Overview

The morph codebase has two distinct types of packages:

- **libs/** - Runtime libraries consumed by generated code
- **contexts/** - Domain contexts containing generated packages and generation infrastructure

## The Critical Distinction

- **libs/** = Runtime libraries that generated code imports at runtime
- **contexts/** = Domain-specific packages organized by bounded context

### Dependency Classification for libs/
- **direct** = Imported directly by generated code
- **transitive** = Not imported directly, but depended on by packages that are imported
- **internal** = Only used by morph's generation pipeline, not in generated code's runtime

## Libs (`libs/`)

Libs are **runtime dependencies** that generated applications import and use at runtime.

### Characteristics

- Imported by user-generated code (e.g., `@morphdsl/test` in generated test files)
- Stable public APIs that external users depend on
- Dogfooding candidates - could be generated from the morph schema itself
- Minimal internal dependencies

### Current Libs

| Package | Purpose | Dep Type |
|---------|---------|----------|
| `@morphdsl/core` | Morph's own generated core (operations, types) | direct |
| `@morphdsl/dsl` | Morph's own generated DSL (schemas, errors) | direct |
| `@morphdsl/operation` | defineOperation(), operation types | direct |
| `@morphdsl/test` | scenario(), given/when/then DSL | direct |
| `@morphdsl/property` | Property-based testing DSL | direct |
| `@morphdsl/scenario` | Reference binding, interpolation | transitive |
| `@morphdsl/scenario-runner` | Base scenario runner | transitive |
| `@morphdsl/property-runner` | Base property runner | transitive |
| `@morphdsl/auth` | Auth interfaces, error types | direct |
| `@morphdsl/auth-password` | Password auth implementation | direct |

## Contexts (`contexts/`)

Contexts organize packages by bounded context. Each context can have generated packages (dsl, core) and may contain generation infrastructure.

### Context Structure

Each domain context follows this pattern:

```
contexts/{context-name}/
├── dsl/                     # Types, schemas, errors, arbitraries
├── core/                    # Operations, handlers, services, layers
└── impls/                   # Hand-written implementations (optional)
```

### Generation Context (`contexts/generation/`)

The `generation` context is special - it contains both generated packages and the generation infrastructure itself:

```
contexts/generation/
├── dsl/                     # @morphdsl/generation-dsl (generated)
├── core/                    # @morphdsl/generation-core (generated)
├── impls/                   # Hand-written implementations for generation operations
│
├── targets/                 # Generation targets (apps + libs)
│   ├── api/                 # REST API target
│   │   ├── generator/       # @morphdsl/runtime-api
│   │   ├── plugin/          # @morphdsl/plugin-api
│   │   └── scenario-runner/ # @morphdsl/scenario-runner-api
│   ├── cli/                 # CLI target
│   │   ├── generator/       # @morphdsl/runtime-cli
│   │   ├── plugin/          # @morphdsl/plugin-cli
│   │   ├── scenario-runner/ # @morphdsl/scenario-runner-cli
│   │   └── property-runner/ # @morphdsl/property-runner-cli
│   ├── mcp/                 # MCP server target
│   ├── ui/                  # Web UI target
│   ├── dsl/                 # DSL library target
│   ├── core/                # Core library target
│   ├── client/              # Client library target
│   └── monorepo/            # Monorepo root target
│
├── builders/                # Reusable code builders
│   ├── app/                 # @morphdsl/builder-app
│   ├── readme/              # @morphdsl/builder-readme
│   ├── test/                # @morphdsl/builder-test
│   └── scaffold/            # @morphdsl/builder-scaffold
│
├── generators/              # Cross-cutting generators
│   ├── types/               # @morphdsl/generator-types
│   ├── openapi/             # @morphdsl/generator-openapi
│   ├── diagrams/            # @morphdsl/generator-diagrams
│   ├── env/                 # @morphdsl/generator-env
│   ├── scenarios/           # @morphdsl/generator-scenarios
│   └── properties/          # @morphdsl/generator-properties
│
└── plugin/                  # @morphdsl/plugin (plugin system interface)
```

### Target Structure

Each target under `targets/` follows a consistent pattern:
- **generator/** - Code generation logic (e.g., `createApi()`, `createCli()`)
- **plugin/** - Plugin that orchestrates generation for this target
- **scenario-runner/** - Test harness for this target (where applicable)
- **property-runner/** - Property test runner (CLI and core only)

### Builders

Reusable code builders shared across generators:
- App scaffolding (Dockerfile, package.json patterns)
- README section builders
- Test file scaffolding
- Project scaffolding

### Generators

Cross-cutting generators used by multiple plugins:
- Type generation
- Environment file generation
- OpenAPI spec generation
- Diagram generation

## Decision Criteria

### When to Create a Lib

Create a lib when:

1. **Generated code imports it** - If generated applications need `import { something } from "@morphdsl/foo"`, it's a lib
2. **External users depend on it** - Stable API required for user-facing functionality
3. **It's self-contained** - Minimal dependencies, clear purpose
4. **Dogfooding potential** - Could eventually be generated from a schema definition

### When to Create a Context Package

Create a context package when:

1. **Domain-specific code** - Types, operations, services for a bounded context
2. **Generated from schema** - DSL and core packages are generated from domain schemas
3. **Hand-written implementations** - Put in `impls/` subdirectory

### When to Create Generation Infrastructure

Create generation infrastructure (under `contexts/generation/`) when:

1. **Only generators use it** - Internal to the morph code generation pipeline
2. **Implementation detail** - Part of how morph works, not what it produces
3. **Utility/helper code** - Shared across generators but not exported to users
4. **Factory pattern** - Creates runtime instances (e.g., `createApi()`)

### Where to Place Generation Infrastructure

- **Target-specific generation?** → `contexts/generation/targets/{type}/`
- **Supporting utility?** → `libs/utils/`
- **Reusable code builder?** → `contexts/generation/builders/`
- **Cross-cutting generator?** → `contexts/generation/generators/`
- **Plugin system?** → `contexts/generation/plugin/`

## Related Documentation

- [Architecture Overview](./overview.md) - High-level morph architecture
- [Domain Schema](./domain-schema.md) - Schema definition format
