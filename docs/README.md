# Morph Documentation

## Guides

- [Getting Started](guides/getting-started.md) — Build a pastebin app from a `.morph` schema
- [Using the Published Packages](guides/using-published-packages.md) — CLI, MCP server, VS Code extension; install paths and version pinning
- [Deploying](guides/deploying.md) — Docker, Procfile platforms, env-var configuration
- [MCP Integration](guides/mcp-integration.md) — Wire `@morphdsl/mcp` into Claude Code, Cursor, Codex
- [VS Code Extension](guides/vscode-extension.md) — Install and use the `.morph` syntax-highlighting extension
- [Versioning and Upgrading](guides/versioning.md) — How `@morphdsl/*` versions move and how to upgrade a generated project
- [Custom Extensions](guides/custom-extensions.md) — Add a custom storage / auth / event-store backend in a generated project
- [Troubleshooting](guides/troubleshooting.md) — Common errors and fixes
- [Performance Notes](guides/performance.md) — Backend trade-offs and what we know about scaling

## Reference

- [DSL Reference](guides/dsl-reference.md) — Complete `.morph` syntax reference

## Concepts

- [DDD Primer](concepts/ddd-primer.md) — Crash course in domain-driven design concepts used by morph
- [Algebraic Foundations](concepts/algebraic-foundations.md) — Lawvere's functorial semantics as morph's theoretical basis
- [CQRS](concepts/cqrs.md) — Command/query separation in the domain schema
- [Domain Events](concepts/domain-events.md) — Event system design and how it differs from operation replay
- [Transformation Domains](concepts/transformation-domains.md) — Non-CRUD, transformation-centric schemas
- [Modeling by Example](concepts/modeling-by-example.md) — Example-driven domain modeling
- [Features and Bugs](concepts/features-and-bugs.md) — How morph defines features and bugs via DSL, invariants, and examples
- [Testing Philosophy](concepts/testing-philosophy.md) — Scenarios as algebraic laws
- [Formal Verification](concepts/formal-verification.md) — SMT-LIB2 invariant verification

## Architecture

- [Source Tour](architecture/tour.md) — Guided walkthrough of key source files
- [Contexts Structure](architecture/contexts.md) — Context-centric package organization
- [Extensions](architecture/extensions.md) — Schema extensions for storage, auth, and infrastructure
- [12-Factor](architecture/12-factor.md) — How generated apps follow 12-factor methodology
- [Authorization](design/authorization.md) — Authorization as domain invariants
- [Execution Context](design/context.md) — How auth and request metadata flow through generated apps
- [Schema Model](design/schema-model.md) — Schema model design
- [UI Authentication](design/ui-auth.md) — Auth handling in generated HTMX web apps
- [Prose Design](design/prose-design.md) — Why prose templates are hand-written
- [Domain Model](domain-model.md) — Visual documentation generated from schema

## Other

- [Images](images/) — Screenshots and diagrams
