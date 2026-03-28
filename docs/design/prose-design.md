# Prose Design: Why Hand-Written?

Prose templates render operations as human-readable BDD steps in test output:

```
Scenario: Create and complete a todo
  ✓ Taylor creates a todo "Buy milk" (1.8ms)
  ✓ Taylor completes the todo "Buy milk" (1.2ms)
```

## Template Syntax

Prose templates are plain strings with interpolation:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{param}` | Operation parameter | `'{actor} creates a todo "{title}"'` |
| `{actor}` | Scenario actor name | `'{actor} lists todos'` |
| `[param? text]` | Conditional (shown if truthy) | `'{actor} lists todos [includeCompleted?including completed]'` |
| `{$binding.field}` | Value from prior step | `'{actor} completes the todo "{$todo.title}"'` |

## Why Hand-Written

Structure is derivable from the schema. Given an operation `createUser(name, email, role)`, a generator could emit:

```
"{actor} calls createUser with name {name}, email {email}, role {role}"
```

But this is robotic. The English phrasing carries **semantic intent** that the algebra deliberately does not prescribe:

- `createUser` could be "creates a user", "registers an account", or "signs up"
- `deletePost` could be "deletes the post", "removes the article", or "unpublishes"
- Conditional blocks like `[includeCompleted?including completed]` require knowing which parameters are flags vs. data

The operation algebra defines **what** can happen. Prose defines **how we talk about it**. These are separate concerns: one is structural, the other is presentational. Conflating them would force domain language into the schema or force generic phrasing onto users.

## Algebraic Role

In the categorical model (see [algebraic-foundations.md](../concepts/algebraic-foundations.md)), the schema defines a free algebra F_dsl — the initial object in the category of T-algebras. Every concrete interpretation (handlers, API routes, CLI commands, tests) is a unique homomorphism from F_dsl.

Prose is one such interpretation: a projection from F_dsl to natural language. Initiality guarantees that a mechanical projection **exists** — you can always derive `"{actor} calls {opName} with {params}"`. But initiality says nothing about the **quality** of that projection. Hand-written prose is a semantically rich interpretation that preserves domain meaning where a mechanical one would lose it.

This is the same reason handler implementations are hand-written: the algebra tells you the signature, but the business logic requires domain knowledge.

## Where Prose Lives

Prose follows the same fixture pattern as handler implementations:

```
impls/src/prose.ts          Hand-written fixture
  ↓ re-exported
core/src/index.ts           Public API (import { prose } from "@app/context-core")
  ↓ imported by
scenario runner             Interpolates templates during test execution
```

For morph's own contexts: `extensions/<ext>/impls/src/prose.ts`
For example apps: `examples/fixtures/<app>/dsl/prose.ts`

## Interpolation Flow

1. **Fixture** defines templates: `createTodo: '{actor} creates a todo "{title}"'`
2. **Runner** receives prose in config: `createLibraryRunner({ prose, ... })`
3. **Execution** resolves bindings (`$todo.title` → actual value from prior step)
4. **`renderStepProse()`** interpolates `{actor}`, `{params}`, `[conditionals]`, `{$bindings}`
5. **Output** prints rendered step: `✓ Taylor creates a todo "Buy milk" (1.8ms)`

If no prose template exists for an operation, the runner falls back to a structural representation: `operationName(param=value, ...)`.

## Multi-Context Composition

When an app has multiple contexts (e.g., blog-app with users + posts), each context provides its own prose. The generator merges them into a single flat `Record<string, string>` keyed by operation name (which is unique across contexts by schema constraint). At runtime, `renderStepProse()` looks up by operation name — no merging algorithm needed.

## Auto-Generation as Complement

The `Auto-generate prose templates` backlog item (P3/M) would generate **default** prose as a starting point — not a replacement for hand-written prose. Users could accept the defaults for rapid prototyping and refine them later. This preserves the design: prose is always a fixture, whether initially generated or written from scratch.
