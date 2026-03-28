# Testing Philosophy: Scenarios as Algebraic Laws

This document explains how Gherkin scenarios, step definitions, and the nested TDD loop fit into Morph's algebraic model.

## The Key Insight

**Gherkin scenarios are algebraic laws expressed as examples.**

In algebra, laws constrain which implementations are valid. For example, addition must be commutative: `a + b = b + a`. Any implementation that violates this law is incorrect.

Similarly, Gherkin scenarios define what it means to correctly implement the domain algebra. An implementation is valid if and only if it satisfies all scenarios.

## Scenarios, Steps, and Interpretations

| Component       | Role                                                | Category Theory                                           |
| --------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Scenario        | A law the algebra must satisfy                      | Equation in theory T                                      |
| Step definition | How to verify the law for a specific interpretation | Component of natural transformation η applied to equation |
| Passing tests   | Evidence that the interpretation satisfies the laws | η preserves equations (naturality holds)                  |

See [Algebraic Foundations](../concepts/algebraic-foundations.md) for the full functorial semantics model.

### Same Scenarios, Different Step Definitions

The same scenarios can be executed against different interpretations:

```gherkin
Scenario: Create an item
  Given an empty list
  When I create an item titled "Widget"
  Then the list contains one item
```

**@core steps** (test the library directly):

```typescript
Given("an empty list", function () {
	this.list = createList({ repo: inMemoryRepo() });
});
When("I create an item titled {string}", function (title) {
	this.result = createItem(this.list.id, title);
});
```

**@cli steps** (test via command line):

```typescript
Given("an empty list", function () {
	this.listId = execSync("myapp create-list").trim();
});
When("I create an item titled {string}", function (title) {
	execSync(`myapp create-item --list ${this.listId} --title "${title}"`);
});
```

**@api steps** (test via HTTP):

```typescript
Given("an empty list", function () {
	const res = await fetch("/lists", { method: "POST" });
	this.listId = (await res.json()).id;
});
When("I create an item titled {string}", function (title) {
	await fetch(`/lists/${this.listId}/items`, {
		method: "POST",
		body: JSON.stringify({ title }),
	});
});
```

All three execute the **same scenario** but verify **different interpretations**.

## The Nested TDD Loop

The development workflow uses a nested loop structure:

```
OUTER LOOP (Cucumber scenarios)
│
│   Write/modify scenario
│   ↓
│   Run scenarios → RED (expected to fail)
│   ↓
│   ┌─────────────────────────────────────┐
│   │ INNER LOOP (unit tests)             │
│   │                                     │
│   │   Write unit test → RED             │
│   │   Write implementation → GREEN      │
│   │   Refactor                          │
│   │   (repeat for each helper needed)   │
│   │                                     │
│   └─────────────────────────────────────┘
│   ↓
│   Run scenarios → GREEN
│   ↓
│   Refactor (run all scenarios to verify)
│
└── Next scenario
```

### Why Two Loops?

- **Outer loop** — Verifies the interpretation satisfies the algebra's laws
- **Inner loop** — Builds the internal machinery of the implementation

The outer loop tests _what_ the system does (behavior). The inner loop tests _how_ it does it (mechanics).

## Step Definition Generation

Morph generates step definitions for each interpretation:

### Library Steps (@core)

Generated from schema operations:

- Given steps set up state via repository
- When steps call operations directly
- Then steps assert on results/state

### App Steps (@cli, @api, @mcp)

Generated from the same scenarios but different execution:

- Given steps use the app interface to set up state
- When steps invoke the app (shell command, HTTP request, MCP message)
- Then steps verify the app's response

Because apps are derived from operations via natural transformation, scenarios that pass against @core should also pass against apps — this validates the transformation is correct.

## What This Enables

1. **Portable specifications** — Same scenarios test library and all apps
2. **Transformation validation** — If @core passes but @cli fails, the CLI generator has a bug
3. **Confidence in derivation** — Mechanical generation is verified by running the same laws
4. **Living documentation** — Scenarios describe behavior in domain language

## Generation Strategy

For each interpretation, generate:

1. **World/context** — Test state shared across steps
2. **Parameter types** — Parse domain values from step text
3. **Step definitions** — Map step patterns to interpretation calls
4. **Hooks** — Before/After for setup/teardown

The step patterns come from the schema's `examples`. The step bodies differ per interpretation but verify the same laws.

## When Scenarios Don't Apply: Pure Functions

Not every operation type benefits from scenario testing. Scenarios verify that **stateful operations** (commands and queries) produce correct results across interpretations — but **functions** are pure morphisms with none of the properties that make scenarios valuable.

Functions have:

- **No state to set up** — no Given step, because functions don't read or write repositories
- **No side effects to observe** — no Then-state-changed step, because functions don't emit events or mutate state
- **No execution context** — functions don't depend on `R` (environment), so there's nothing to swap between interpretations
- **Identical behavior everywhere** — the same pure computation in every interpretation, so running scenarios against @core vs @api vs @cli would just repeat the same test

Since scenarios are equations in theory T (see [Algebraic Foundations](../concepts/algebraic-foundations.md): "functions — Pure morphisms (no state, no effects)"), and functions don't participate in the stateful theory, scenarios add no verification value.

Pure functions are better tested with:

- **Direct unit tests** — assert input→output for known examples
- **Property-based tests** — use fast-check to verify algebraic laws (idempotency, commutativity, associativity) over random inputs

This is why the `defineOp` wrapper is intentionally not generated for functions (see `context-dsl.ts`: "Functions are pure and don't need defineOp wrappers"). They don't need the operation infrastructure — dependency injection, events, context — they're just computations.

Morph itself only has function operations, which is why `fixtures/scenarios/scenarios.ts` is deliberately empty.
