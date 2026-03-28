# Core

Generates the domain core — handler interfaces, live and mock implementations, services (storage, auth, events), repositories, invariants, and layer composition.

## What It Generates

Per domain context:

| File / Directory | Purpose |
|-----------------|---------|
| `operations/{op}/handler.ts` | Handler interface with typed `handle` method |
| `operations/{op}/impl.ts` | `Layer.effect` implementation using repositories |
| `operations/{op}/mock-impl.ts` | Deterministic mock using fast-check (seed: 42) |
| `operations/index.ts` | `HandlersLayer` and `MockHandlersLayer` composites |
| `services/` | Auth, storage, event store, repositories, ID generator |
| `invariants/` | Domain constraint validators |
| `subscribers/` | Event subscriber implementations |
| `mocks/` | Mock dependency layers for testing |
| `layers.ts` | Top-level layer composition |
| `index.ts` | Barrel export |

## Schema Triggers

- **Always generated** for contexts with operations
- Handler count matches the number of commands + queries in the context
- Auth services generated when `extensions.auth` is configured
- Event store services generated when commands emit events
- Storage backends generated from `extensions.storage.backends`

## Example

### Schema Input

```morph
command createTodo {
  params { title: String, userId: UserId }
  options { dueDate?: Date, priority?: Priority }
  returns Todo
  errors [UserNotFoundError, InvalidDueDateError]
}
```

### Generated Output

**handler.ts** — Handler interface:

```typescript
import type { Todo, UserId, UserNotFoundError, InvalidDueDateError } from "@todo-app/tasks-dsl";
import type { Effect } from "effect";
import { Context } from "effect";

export interface CreateTodoHandler {
  readonly handle: (
    params: { readonly title: string; readonly userId: UserId },
    options: {
      readonly dueDate?: Date | undefined;
      readonly priority?: "low" | "medium" | "high" | undefined;
    },
  ) => Effect.Effect<Todo, UserNotFoundError | InvalidDueDateError>;
}

export const CreateTodoHandler = Context.GenericTag<CreateTodoHandler>(
  "@todo-app/CreateTodoHandler",
);
```

**impl.ts** — Live implementation with dependency injection:

```typescript
export const CreateTodoHandlerLive = Layer.effect(
  CreateTodoHandler,
  Effect.gen(function* () {
    const idGen = yield* IdGenerator;
    const todoRepo = yield* TodoRepository;
    const userRepo = yield* UserRepository;

    return {
      handle: (params, options) =>
        Effect.gen(function* () {
          const user = yield* userRepo.findById(params.userId);
          if (!user) return yield* Effect.fail(new UserNotFoundError({ message: "User not found" }));

          const id = yield* idGen.generate();
          const todo = { id: todoId(id), title: params.title, completed: false, /* ... */ };
          yield* todoRepo.save(todo);
          return todo;
        }),
    };
  }),
);
```

**operations/index.ts** — Composed layers:

```typescript
export const HandlersLayer = Layer.mergeAll(
  CompleteTodoHandlerLive,
  CreateTodoHandlerLive,
  CreateUserHandlerLive,
  DeleteTodoHandlerLive,
  GetTodoHandlerLive,
  ListTodosHandlerLive,
  TransferTodosHandlerLive,
);

export const MockHandlersLayer = Layer.mergeAll(
  CompleteTodoHandlerMock,
  CreateTodoHandlerMock,
  /* ... */
);
```

## Testing

Core has both scenario and property runners:

- **Scenarios** test end-to-end operation behavior using `HandlersLayer` directly
- **Properties** validate invariants using fast-check against mock data

See the [testing README](../../testing/README.md).
