# DSL

Generates the typed domain schema layer — branded IDs, entity schemas, error types, operation constructors, arbitraries, and prose descriptions.

## What It Generates

Per domain context:

| File | Purpose |
|------|---------|
| `schemas.ts` | Effect/Schema entity types with branded IDs, parse/encode helpers |
| `errors.ts` | `TaggedError` classes for each domain error |
| `{context}.ts` | `defineOp()` wrappers for each command and query |
| `arbitraries.ts` | fast-check `Arbitrary` generators for entities and value objects |
| `prose.ts` | Human-readable operation descriptions for UI/CLI |
| `schema.ts` | Runtime schema wrapper (primary context only) |
| `index.ts` | Barrel export |

## Schema Triggers

- **Always generated** for every context that has types, operations, or errors
- `schemas.ts` — context has entity or value object definitions
- `errors.ts` — context has error definitions
- `arbitraries.ts` — context has entities or value objects
- `{context}.ts` — context has commands or queries
- `prose.ts` — context has operations with descriptions

## Example

### Schema Input

```morph
entity Todo {
  completed Boolean
  title     String
  userId    UserId
  priority  "low" | "medium" | "high"
  tags      String[]
}

command createTodo {
  params { title: String, userId: UserId }
  options { priority?: "low" | "medium" | "high", tags?: String[] }
  returns Todo
  errors [UserNotFoundError]
}
```

### Generated Output

**schemas.ts** — Branded IDs and entity schemas:

```typescript
import * as S from "effect/Schema";

export const TodoIdSchema = S.String.pipe(
  S.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  S.brand("TodoId"),
);
export type TodoId = S.Schema.Type<typeof TodoIdSchema>;
export const todoId = (id: string): TodoId => id as TodoId;

export const TodoSchema = S.Struct({
  id: TodoIdSchema,
  completed: S.Boolean,
  priority: S.Union(S.Literal("low"), S.Literal("medium"), S.Literal("high")),
  tags: S.Array(S.String),
  title: S.String,
  userId: UserIdSchema,
});

export type Todo = S.Schema.Type<typeof TodoSchema>;
export const parseTodo = S.decodeUnknownSync(TodoSchema);
export const encodeTodo = S.encodeSync(TodoSchema);
```

**errors.ts** — Tagged errors:

```typescript
import { Data } from "effect";

export class AlreadyCompletedError extends Data.TaggedError(
  "AlreadyCompletedError",
)<{
  readonly message: string;
}> {}

export class TodoNotFoundError extends Data.TaggedError(
  "TodoNotFoundError",
)<{
  readonly message: string;
}> {}
```

**tasks.ts** — Operation constructors:

```typescript
import { defineOp } from "@morph/operation";
import type { Todo, TodoId, User, UserId } from "./schemas";

export const createTodo = defineOp<
  { title: string; userId: UserId },
  Todo
>("createTodo");

export const completeTodo = defineOp<{ todoId: TodoId }, Todo>("completeTodo");

export const listTodos = defineOp<
  { includeCompleted?: boolean; userId: UserId },
  readonly Todo[]
>("listTodos");
```

## Testing

DSL types are exercised indirectly — the `arbitraries.ts` generators power property-based tests, and the `defineOp()` constructors are used by scenario tests across all targets. See the [testing README](../../testing/README.md).
