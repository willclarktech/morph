# Design Decisions

Settled decisions with rationale. Prevents re-litigating choices already explored.

## Uniform Effect wrapping for all operations

**Status:** Decided — keep uniform wrapping.

**Context:** All operation handlers return `Effect.Effect<T, E>`, even pure functions that can never fail (`Effect.Effect<T, never>`). The ceremony is `Layer.succeed` + `Effect.gen` for every handler, regardless of whether it has errors.

**Alternatives explored:**

1. **Plain return for total functions** — Functions with no error declarations return `T` directly instead of `Effect.Effect<T, never>`. Reduces ceremony for simple cases.

2. **Keep uniform wrapping** (chosen) — All handlers use `Effect.gen` regardless of error surface.

**Decision:** Adding or removing an error declaration from an operation shouldn't fundamentally change the handler signature. The bifurcation (plain return for total functions, Effect for partial) creates an inconsistent boundary that shifts whenever error declarations change. The uniform `Layer.succeed` + `Effect.gen` pattern is consistent, and the ceremony per handler is modest (3 lines of boilerplate).

## Hash-prefixed tag profiles

**Status:** Decided — use `#` for profiles, `@` for literal tags.

**Context:** Operations can be tagged with `@cli @api @mcp` to control which targets generate code for them. Repeating the same tag set across many operations is verbose.

**Alternatives explored:**

1. **Profile references use `@`** — e.g., `@web` expands to `@cli @api @mcp`. Collides with literal tags; requires distinguishing "is this a profile or a tag?" at parse time.

2. **Hash-prefixed profiles** (chosen) — `#web` expands to `@cli @api @mcp`. No ambiguity: `#` is always a profile reference, `@` is always a literal tag.

**Decision:** `#` prefix provides zero-ambiguity parsing. Profiles are defined in a `profiles {}` block at the domain level and referenced with `#name` in context bodies. Generators receive expanded `@` tags — no downstream changes needed.
