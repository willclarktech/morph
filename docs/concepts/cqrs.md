# CQRS in Morph

Command Query Responsibility Segregation (CQRS) is an architectural pattern that separates read operations (queries) from write operations (commands). Morph's domain schema explicitly distinguishes between these two types of operations.

## Commands vs Queries

| Aspect              | Commands                 | Queries           |
| ------------------- | ------------------------ | ----------------- |
| **Purpose**         | Modify state             | Read state        |
| **Side effects**    | Yes                      | No                |
| **Events**          | Required (emits field)   | None              |
| **Post-invariants** | Supported                | Not supported     |
| **Idempotency**     | Generally not idempotent | Always idempotent |

## Schema Structure

Operations are organized into `commands` and `queries` sections within each context:

```json
{
  "contexts": {
    "tasks": {
      "commands": {
        "createTodo": {
          "description": "Create a new todo",
          "emits": {
            "name": "TodoCreated",
            "description": "Emitted when a todo is created"
          },
          "input": { ... },
          "output": { ... },
          "errors": [ ... ],
          "pre": ["UserIdMatchesCurrentUser"],
          "tags": ["@cli", "@api"]
        }
      },
      "queries": {
        "listTodos": {
          "description": "Get all todos for a user",
          "input": { ... },
          "output": { ... },
          "errors": [ ... ],
          "pre": ["UserIdMatchesCurrentUser"],
          "tags": ["@cli", "@api"]
        }
      }
    }
  }
}
```

## Commands

Commands are operations that change system state. They must:

1. **Emit an event** - The `emits` field is required. This produces a domain event that captures what changed.
2. **Return the result** - Typically returns the created/modified entity.

Commands support:

- Pre-invariants (`pre`) - Conditions checked before execution
- Post-invariants (`post`) - Conditions checked after execution
- Error definitions - Expected failure cases

### Example Command

```json
"createTodo": {
  "description": "Create a new todo for a user.",
  "emits": {
    "name": "TodoCreated",
    "description": "Emitted when a new todo is created"
  },
  "errors": [
    {
      "name": "UserNotFound",
      "description": "The specified user does not exist",
      "when": "userId is invalid"
    }
  ],
  "input": {
    "title": {
      "description": "What needs to be done",
      "type": { "kind": "primitive", "name": "string" }
    },
    "userId": {
      "description": "The user creating the todo",
      "type": { "kind": "entityId", "entity": "User" }
    }
  },
  "output": { "kind": "entity", "name": "Todo" },
  "pre": ["UserIdMatchesCurrentUser"],
  "tags": ["@cli", "@api"]
}
```

## Queries

Queries are read-only operations that return data without modifying state. They:

1. **Do not emit events** - The `emits` field is not allowed.
2. **Have no post-invariants** - Since they don't change state, post-conditions don't apply.
3. **Are idempotent** - Calling them multiple times produces the same result.

Queries support:

- Pre-invariants (`pre`) - Authorization checks (e.g., "can this user view this data?")
- Error definitions - Expected failure cases (e.g., "not found")

### Example Query

```json
"listTodos": {
  "description": "Get all todos for a user.",
  "errors": [
    {
      "name": "UserNotFound",
      "description": "The specified user does not exist",
      "when": "userId is invalid"
    }
  ],
  "input": {
    "userId": {
      "description": "The user whose todos to list",
      "type": { "kind": "entityId", "entity": "User" }
    },
    "includeCompleted": {
      "description": "Whether to include completed todos",
      "optional": true,
      "type": { "kind": "primitive", "name": "boolean" }
    }
  },
  "output": {
    "kind": "array",
    "element": { "kind": "entity", "name": "Todo" }
  },
  "pre": ["UserIdMatchesCurrentUser"],
  "tags": ["@cli", "@api"]
}
```

## Generated Code

The generator produces the same operation structure for both commands and queries, but:

- Commands include event emission logic
- Queries skip event-related code paths

Both use the same handler interface pattern, allowing implementations to focus on business logic.

## Helper Functions

The `@morph/domain-schema` package provides helpers for working with commands and queries:

```typescript
import {
	getAllOperations, // Returns all commands + queries
	getAllCommands, // Returns only commands
	getAllQueries, // Returns only queries
	getCommandsWithEvents, // Commands with their event definitions
} from "@morph/domain-schema";
```

## When to Use Each

**Use a Command when:**

- Creating a new entity
- Updating an existing entity
- Deleting an entity
- Any operation that changes system state
- You need to track the change via events

**Use a Query when:**

- Listing entities
- Getting a single entity by ID
- Searching or filtering
- Aggregating data (counts, sums)
- Any operation that only reads data

## Benefits

1. **Explicit intent** - The schema clearly communicates whether an operation modifies state.
2. **Event requirements** - Commands must define what events they emit, improving traceability.
3. **Validation** - Generators can enforce rules (e.g., queries can't emit events).
4. **Documentation** - The separation makes APIs self-documenting.
5. **Future flexibility** - Enables read/write separation patterns if needed later.
