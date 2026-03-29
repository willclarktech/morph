# Testing Architecture

Morph generates three layers of verification for every domain: behavior scenarios (Given/When/Then), property-based invariant tests (fast-check), and formal verification (Z3 SMT-LIB2). All three derive from the same schema.

## Structure

```
contexts/generation/testing/
├── scenario/          # @morphdsl/scenario — BDD step types and DSL
├── scenario-runner/   # @morphdsl/scenario-runner — shared execution engine
├── property/          # @morphdsl/property — property test types (fast-check)
└── property-runner/   # @morphdsl/property-runner — shared property runner interface

contexts/generation/generators/
├── scenarios/         # Generates tests/scenarios/ packages (step definitions)
└── properties/        # Generates tests/properties/ packages (validators)

contexts/generation/targets/*/
├── scenario-runner/   # Per-target Runner implementation
└── property-runner/   # Per-target PropertyRunner implementation
```

## Scenarios

Scenarios are behavior-driven tests using a Given/When/Then DSL. A single scenario definition runs against every target that has a runner.

### Defining Scenarios

Scenarios are generated in `tests/scenarios/` from the schema. Each scenario uses the operation DSL:

```typescript
import { assert, given, ref, scenario, then, when } from "@morphdsl/scenario";
import { completeTodo, createTodo, createUser } from "@todo-app/tasks-dsl";
import type { Todo, User } from "@todo-app/tasks-dsl";

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
      when(
        completeTodo.call({ todoId: ref<Todo>("todo").id }),
      ).as("completedTodo"),
      then(
        assert("completedTodo", "completed").toBe(true).withProse("the todo is marked as completed"),
      ),
    ),
];
```

### Runner Interface

Each target implements the shared `Runner` interface from `@morphdsl/scenario-runner`:

```typescript
interface Runner {
  run(scenario: Scenario): Promise<ScenarioResult>;
  runAll(scenarios: Scenario[]): Promise<SuiteResult>;
  runAllAndPrint(scenarios: Scenario[]): Promise<SuiteResult>;
}
```

### Runner Matrix

| Target | Scenario Runner | How It Executes |
|--------|----------------|-----------------|
| **api** | Yes | HTTP requests to a running server |
| **cli** | Yes | Programmatic command execution |
| **cli-client** | Yes | Remote commands against running API |
| **client** | Yes | Typed HTTP client methods |
| **core** | Yes (embedded) | Direct handler invocation via layers |
| **mcp** | Yes | JSON-RPC protocol over stdio |
| **ui** | Yes | HTTP requests to UI server |

### Generated Test Files

Each target with a scenario runner gets a `src/test/scenarios.test.ts`:

```typescript
import { scenarios } from "@todo-app/scenarios";
import { createApiRunner } from "@morphdsl/scenario-runner-api";

const runner = createApiRunner({ port: 3001 });
const results = await runner.runAllAndPrint(scenarios);
```

## Properties

Property-based tests validate domain invariants using fast-check. Properties run random inputs through validators and verify the predicate holds.

### Defining Properties

Properties are generated in `tests/properties/` from schema invariants:

```typescript
import { validatorProperty } from "@morphdsl/property";
import { TodoArbitrary, UserArbitrary } from "@todo-app/tasks-dsl";
import * as fc from "fast-check";

export const todoBelongsToUser = validatorProperty({
  name: "TodoBelongsToUser",
  description: "Every todo must belong to exactly one user",
  arbitrary: TodoArbitrary,
  contextArbitrary: fc.record({ users: fc.array(UserArbitrary) }),
  validatorName: "validateTodoBelongsToUser",
  predicate: (todo, context) =>
    context.users.some((user) => user.id === todo.userId),
});

export const validatorProperties = [todoBelongsToUser, userOwnsTodo];
```

### Property Runner Matrix

| Target | Property Runner | How It Validates |
|--------|----------------|-----------------|
| **cli** | Yes | Runs validators through CLI handler layer |
| **core** | Yes | Direct validator invocation |

### Generated Test Files

Targets with property runners get a `src/test/properties.test.ts` that imports the validators and runs them with fast-check.

## Formal Verification

SMT-LIB2 checks verify structural properties of the schema using Z3:

- **Consistency:** entity constraints don't contradict each other
- **Precondition satisfiability:** every operation can actually be called (preconditions are satisfiable)

See the [verification target README](../targets/verification/README.md).

## Running Tests

```bash
# Run all tests across all packages
bun run test

# Run tests for a specific target
cd examples/todo-app/apps/api && bun test
cd examples/todo-app/apps/cli && bun test

# Run formal verification
bun run --filter @todo-app/verification verify
```

## How It Fits Together

```
schema.morph
    │
    ├─→ tests/scenarios/      (generated scenario definitions)
    │       │
    │       ├─→ apps/api/test/scenarios.test.ts     (runs via HTTP)
    │       ├─→ apps/cli/test/scenarios.test.ts     (runs via CLI)
    │       ├─→ apps/mcp/test/scenarios.test.ts     (runs via JSON-RPC)
    │       ├─→ apps/ui/test/scenarios.test.ts      (runs via HTTP)
    │       ├─→ libs/client/test/scenarios.test.ts  (runs via client)
    │       └─→ contexts/*/core/test/scenarios.test.ts (runs via layers)
    │
    ├─→ tests/properties/     (generated invariant validators)
    │       │
    │       ├─→ apps/cli/test/properties.test.ts    (fast-check)
    │       └─→ contexts/*/core/test/properties.test.ts (fast-check)
    │
    └─→ tests/verification/   (generated SMT-LIB2 checks)
            │
            └─→ bun run verify                      (Z3 solver)
```

One schema. Three verification strategies. Every target stays consistent.
