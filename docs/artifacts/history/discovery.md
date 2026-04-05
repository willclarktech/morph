# Morph Discovery

Morph is a schema-driven code generation framework. Given a domain schema, it generates complete applications including types, operations, CLI, and test infrastructure.

## Domain Vision

**Problem:** Building domain-driven applications requires extensive boilerplate—types, operations, dependency injection, CLI parsing, test step definitions.

**Solution:** Define the domain once in a formal schema, then derive everything structurally.

**Category Theory Framing** (see [Algebraic Foundations](../concepts/algebraic-foundations.md)):

- **Theory T** = DomainSchema (sorts + operations + equations)
- **Algebras** = enriched functors T → Eff (DSL, core, API, CLI, MCP)
- **App adapters** = natural transformations between algebras (F_core ⇒ F_api, etc.)

## Discovery Artifacts

> **Note:** These are founding documents from the initial design phase. They capture the original vision and domain model that guided early development. The current implementation has evolved significantly — refer to the [DSL Reference](../guides/dsl-reference.md) for current specifications.

- [Domain Model](../artifacts/discovery/domain-model.md) — Ubiquitous language, entities, bounded contexts
- [Personas](../artifacts/discovery/personas.md) — Sam, Taylor, Morgan, Jordan
- [Examples](../artifacts/discovery/examples.md) — Concrete Given/When/Then scenarios

## Package Dependency Graph

```
@morphdsl/domain-schema
       │
       ▼
@morphdsl/operation-dsl
       │
       ▼
┌────────────────────────────────────────────────────────────────┐
│              Generation Context (contexts/generation/)          │
│                                                                │
│  Targets (targets/):                                           │
│    dsl/, core/, api/, cli/, mcp/, ui/, client/                 │
│    Each target has: generator/, plugin/, scenario-runner/      │
│                                                                │
│  Builders (builders/):                                         │
│    app/, readme/, test/, scaffold/                             │
│                                                                │
│  Generators (generators/):                                     │
│    types/, openapi/, diagrams/, env/, scenarios/, properties/  │
└────────────────────────────────────────────────────────────────┘
       │
       ▼
@morphdsl/generation-core (morph's own generated core)
       │
       ▼
apps/cli/ (unified CLI)
apps/mcp/ (MCP server)
```

## Implemented Features

- **API Generator:** Bun.serve() routes from operations
- **MCP Generator:** Model Context Protocol server from operations
- **CLI Generator:** Command-line interface from operations
- **UI Generator:** Server-rendered HTML (Pico CSS + HTMX) from entities
- **Client Generator:** Type-safe API clients

## Future Directions

- **Schema Help Text:** Descriptions flowing to IDE annotations, CLI help, UI tooltips
- **Additional Auth Providers:** OAuth, SAML, API keys
