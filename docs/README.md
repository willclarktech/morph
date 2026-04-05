# Morph Documentation

## Guides

- [Getting Started](guides/getting-started.md) — Build a pastebin app from a `.morph` schema

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
- [Testing Philosophy](testing/testing-philosophy.md) — Scenarios as algebraic laws
- [Formal Verification](testing/formal-verification.md) — Formal verification of domain invariants

## Architecture

- [Source Tour](architecture/tour.md) — Guided walkthrough of key source files
- [Contexts Structure](architecture/contexts-structure.md) — Context-centric package organization
- [Extensions](architecture/extensions.md) — Schema extensions for storage, auth, and infrastructure
- [12-Factor](architecture/12-factor.md) — How generated apps follow 12-factor methodology
- [Design Decisions](design/design-decisions.md) — Settled decisions with rationale
- [Authorization](design/authorization.md) — Authorization as domain invariants
- [Execution Context](design/context.md) — How auth and request metadata flow through generated apps
- [Schema Model](design/schema-model.md) — Schema model design
- [UI Authentication](design/ui-auth.md) — Auth handling in generated HTMX web apps
- [Prose Design](design/prose-design.md) — Why prose templates are hand-written
- [Domain Model](domain-model.md) — Visual documentation generated from schema

## Other

- [Artifacts](artifacts/) — Discovery artifacts, feature specifications, and project history
- [Images](images/) — Screenshots and diagrams
