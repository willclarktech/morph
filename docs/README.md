# Morph Documentation

Morph is a code generation framework that derives full applications from domain schemas. Write a `.morph` schema file describing your domain, and Morph generates typed libraries, REST APIs, CLIs, MCP servers, and web UIs — all from a single source of truth.

## Quick Links

- **[Getting Started](./getting-started.md)** — Schema to running app in 5 minutes
- **[DSL Reference](./dsl-reference.md)** — Complete `.morph` syntax guide
- **[Extensions](./extensions.md)** — Storage, auth, event store, and i18n configuration
- **[Architecture](./architecture.md)** — How Morph works (algebraic foundations, generation pipeline)

## How It Works

```
schema.morph → morph generate → full monorepo
```

1. **Define** your domain in a `.morph` file (entities, operations, events, invariants)
2. **Generate** a complete monorepo with `morph generate`
3. **Implement** business logic in handler files (the only code you write)
4. **Run** any generated app target (API, CLI, MCP, UI)

Every app derives from the same operations via structural transformation — change the schema, regenerate, and all targets stay consistent.

## Generated Output

From a single schema, Morph generates:

| Package | Purpose |
|---------|---------|
| `contexts/<name>/dsl` | Types, schemas, branded IDs, operation descriptors |
| `contexts/<name>/core` | Handler interfaces, layer composition, repositories |
| `apps/api` | REST API with OpenAPI spec and SSE events |
| `apps/cli` | Interactive CLI with REPL and one-off commands |
| `apps/mcp` | MCP server for LLM tool integration |
| `apps/ui` | Web UI with server-side rendering |
| `libs/client` | HTTP client library for the API |
| `tests/scenarios` | BDD scenario tests that run against all targets |
| `tests/properties` | Property-based contract tests for backends |

## Concepts

- **[Algebraic Foundations](./algebraic-foundations.md)** — Category theory model behind Morph
- **[Domain Schema Design](./domain-schema.md)** — Schema format and type system
- **[Transformation Domains](./transformation-domains.md)** — How apps derive from operations
- **[Domain Events](./domain-events.md)** — Event sourcing and CQRS patterns
- **[CQRS](./cqrs.md)** — Command/query separation patterns
- **[Prose Design](./prose-design.md)** — Natural language templates for operations

## Reference

- **[Context Structure](./contexts-structure.md)** — How domain contexts map to packages
- **[Testing Philosophy](./testing-philosophy.md)** — Scenarios as algebraic laws
- **[12-Factor Patterns](./12-factor.md)** — Production deployment patterns
- **[UI & Auth](./ui-auth.md)** — UI generation and authentication patterns
- **[Modeling by Example](./modeling-by-example.md)** — Schema design from scenarios

## Design

- **[Design Decisions](./design-decisions.md)** — Explored and rejected alternatives
- **[Features & Bugs](./features-and-bugs.md)** — Known issues and feature tracking
- **[Discovery](./discovery.md)** — Founding artifacts and domain model
- **[Dogfooding Learnings](./dogfooding-learnings.md)** — Self-generation insights
