# Backlog

## Priority & Effort Ratings

| Priority | Meaning |
|----------|---------|
| P1 | Critical - do now |
| P2 | Important - do soon |
| P3 | Nice to have |
| P4 | Future/exploratory |

| Effort | Meaning |
|--------|---------|
| S | Small (< 1 hour) |
| M | Medium (1-4 hours) |
| L | Large (> 4 hours) |

---

## MVP

| Task | Effort | Notes |
|------|--------|-------|
| Package metadata for publishing | M | Add license, description, repository fields to publishable packages. Remove `"private": true` from packages intended for npm |
| ~~Formal verification for invariants~~ | ~~L~~ | ~~Generate formal proofs that invariants hold~~ — DONE: `@morph/generator-verification` + `@morph/plugin-verification` |

## Post-MVP

### Schema Enhancements

| Task | Effort | Notes |
|------|--------|-------|
| Add example schemas for expression types | S | GreaterThan, LessThan, Contains untested. ContextScope and Equals exercised by blog-app role invariants. delivery-tracker exercises != |
| Configurable ID format | S | Support nanoid, ulid via `config.idFormat`. Currently hardcoded to UUID |
| Improve validation error messages | S | Effect Schema errors are verbose. Add custom error messages to schemas |
| Revisit per-operation errors design | S | Consider defaults/inheritance patterns to reduce schema verbosity |

### Generation Features

| Task | Effort | Notes |
|------|--------|-------|
| Code AST for generation output | L | Minimal code AST replacing string templates. Enables import deduplication, structural composition, format independence |
| DSL operation replay | M | Replay operations from command log — separate from domain events |
| Distributed SSE | M | Redis pub/sub for SSE broadcast across multiple server instances |
| Modular authentication | S | Remaining: OAuth/OIDC (JWT, bearer, API key, session, anonymous done) |
| API generator multi-context support | M | API plugin only uses primary context. MCP+CLI fixed; API entry point, scenario test, package.json need multi-context imports/storage |
| CLI generator improvements | M | Custom formatters, better help |
| Native backend indexing | M | SQLite json_extract indexes, Redis secondary hashes. Less relevant if relational schema generation is done first |
| Modular services (package-based) | M | Services as separate packages for reuse across generated apps |
| UI visual regression testing | M | Playwright component tests, visual regression snapshots |
| Full Pico CSS variable support | M | Expand UiTheme to cover all 130+ Pico CSS variables |
| UI config overrides | S | Custom labels, hidden columns, field order overrides in ui.config.ts |
| Types-only generation mode | S | Generate types without parse/encode functions for lightweight consumers |
| Split schemas into files | S | Individual schema files per entity instead of single `schemas.ts` |
| E2E test layer flag | S | `bun test --layer=redis` to switch storage backend in tests |
| Configurable subscriber failure | S | Choose if subscriber errors fail operations or fire-and-forget |
| Event testing helpers | S | `findEventsByTag`, `findLastEvent`, `eventsAfter` |
| E2E test output formatting | S | Color/formatting for scenario test runner output |
| Password validation as invariant | S | Model password verification as a context-scoped invariant |
| Prefix comments with @note | S | Distinguish confirmed/intentional comments from stale ones |

### Architecture

| Task | Effort | Notes |
|------|--------|-------|
| Generation pipeline DSL | M | Compose generators as data (sequence, parallel, conditional) |
| K-framework for non-TS output | M | Investigate K-framework for generating Rust, Go, etc. |
| Audit morph vs generated code packages | M | Clarify build-time vs runtime package boundaries |
| Feature completeness roadmap | S | Document closed meta-level vs open adapter level |

---

## Infrastructure

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Standardize package.json key order | P4 | S | Consistent ordering across generated and template files |
| Multi-framework step gen | P4 | M | Abstract step generation for Playwright/Cypress |
| Revisit functional lint rules | P4 | M | Re-enable disabled functional/* rules after refactoring |

---

## Recently Completed

| Task | Notes |
|------|-------|
| Fix UI postinstall browser install on CI | Removed postinstall from generated UI packages, Playwright browsers installed once in CI |
