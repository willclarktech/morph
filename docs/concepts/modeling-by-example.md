# Modeling by Example

## Overview

Domain schemas include **scenarios** that demonstrate operations in context. These scenarios serve dual purposes:

1. **Specification** — Executable documentation of expected behavior
2. **Test generation** — Source for automated tests that run against every target (core, API, CLI, MCP, UI)

## Scenario DSL

Scenarios are defined in TypeScript using a fluent builder API:

```typescript
import { assert, given, ref, scenario, then, when } from "@morphdsl/scenario";
import type { Todo, User } from "@todo/tasks-dsl";
import { completeTodo, createTodo, createUser, listTodos } from "@todo/tasks-dsl";

export const scenarios = [
  scenario("Create and complete a todo")
    .withActor("Taylor")
    .steps(
      given(
        createUser.call({ email: "taylor@test.com", name: "Taylor", password: "password123" }),
      ).as("user"),
      when(
        createTodo.call({ userId: ref<User>("user").id, title: "Buy milk" }),
      ).as("todo"),
      when(completeTodo.call({ todoId: ref<Todo>("todo").id })).as("completedTodo"),
      then(
        assert("completedTodo", "completed")
          .toBe(true)
          .withProse("the todo is marked as completed"),
      ),
    ),
];
```

### Builder API

| Function | Purpose |
|----------|---------|
| `scenario(name)` | Create a named scenario |
| `.withActor(name)` | Set the actor for prose rendering |
| `.withTags(...tags)` | Add tags for filtering |
| `.steps(...steps)` | Add given/when/then steps |
| `given(op.call(params)).as("binding")` | Precondition — setup step with optional binding |
| `when(op.call(params)).as("binding")` | Action — the operation under test |
| `then(assert(...))` | Verification — check results |
| `ref<Type>("binding").field` | Type-safe reference to a previous step's result |

### Assertions

```typescript
assert("binding", "field").toBe(value)           // exact equality
assert("binding").toHaveLength(n)                 // collection length
assert("binding", "field").toBeDefined()          // field exists
assert("binding", "field").toContain(item)        // collection contains
```

All assertions support `.withProse("human-readable description")`.

### Cross-Step References

The `ref()` function creates type-safe proxies that resolve at runtime:

```typescript
// ref<User>("user").id produces "$user.id" at runtime
when(createTodo.call({ userId: ref<User>("user").id, title: "Buy milk" })).as("todo")
```

The runner maintains a bindings map across steps within a scenario. When a step uses `.as("name")`, its result is stored and available to later steps via `ref("name")`.

## Prose Templates

Each context defines prose templates that convert operation calls into human-readable text:

```typescript
// fixtures/todo/dsl/prose.ts
export const prose: Prose<typeof ops> = {
  createUser: '{actor} creates a user with name "{name}" and email "{email}"',
  createTodo: '{actor} creates a todo "{title}"',
  completeTodo: '{actor} completes the todo "{$todo.title}"',
  deleteTodo: '{actor} deletes the todo "{$todo.title}"',
  listTodos: "{actor} lists todos [includeCompleted?including completed]",
};
```

### Template syntax

| Pattern | Replaced with |
|---------|--------------|
| `{paramName}` | Parameter value |
| `{actor}` | Scenario actor name |
| `{$binding.field}` | Value from a previous step's result |
| `[paramName? text]` | Conditional text — included only if param is truthy |

### Rendering pipeline

1. `interpolate(template, params, { actor })` — replaces `{param}` placeholders and evaluates conditionals
2. `interpolateBindings(text, bindings)` — replaces `{$binding.field}` with runtime values
3. The fully resolved prose appears in test output

## Design Principles

### Scenarios are algebraic, not narrative

The domain schema formalizes the **algebra** of a system: types, operations, and invariants. Scenarios demonstrate how operations compose to achieve outcomes. They are not user stories or narrative documentation.

### Step data is self-documenting

All data relevant to a step should appear in the operation call itself. Prose templates render this data into readable text, but the scenario definition is the source of truth:

```typescript
// Good — all data visible in the operation call
given(createUser.call({ email: "taylor@test.com", name: "Taylor", password: "password123" })).as("user")

// Bad — data hidden elsewhere, operation call is incomplete
given(createUser.call({ ...someFixture })).as("user")
```

### Actors are identifiers, not personas

Names like "Taylor" in `.withActor("Taylor")` are **identifiers** for prose rendering, not persona references. They make output readable ("Taylor creates a todo" vs "the user creates a todo") and have no special meaning beyond being a string.

Personas are **discovery artifacts** — they inform what scenarios to write, but they don't appear in the schema's algebraic structure.

## One Scenario, Many Targets

The same scenario definitions run against every generated target:

| Runner | Execution strategy |
|--------|-------------------|
| Core | Direct handler invocation via Effect layers |
| API | HTTP requests to running server |
| CLI | Programmatic command execution |
| CLI-Client | Remote commands against running API |
| Client | Typed HTTP client methods |
| MCP | JSON-RPC protocol over stdio |
| UI | HTTP requests to UI server |

This ensures all targets behave identically. A test file looks like:

```typescript
import { createLibraryRunner } from "@morphdsl/scenario-runner-core";
import { scenarios } from "@todo/scenarios";
import { HandlersLayer, InMemoryLayer, ops, prose } from "@todo/tasks-core";

const runner = createLibraryRunner({
  layer: TestLayer,
  operations: { ... },
  prose,
});

test("scenarios", async () => {
  const result = await runner.runAllAndPrint(scenarios);
  expect(result.failed).toBe(0);
});
```

## File Layout

```
examples/fixtures/<name>/
├── scenarios/scenarios.ts    # Hand-written scenario definitions
└── dsl/prose.ts              # Hand-written prose templates

examples/<name>/              # Generated output
├── tests/scenarios/          # Compiled scenarios package
└── contexts/*/core/src/test/ # Target-specific test files
```

Scenario files and prose templates are hand-written fixtures that survive regeneration. Everything else is generated.
