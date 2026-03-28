# Implementations

Generates handler scaffold files — one per operation — that are meant to be hand-written. These are the only generated files that developers edit directly.

## What It Generates

Per domain context:

| File | Purpose |
|------|---------|
| `{operation}/impl.ts` | Handler implementation scaffold |
| `index.ts` | Barrel re-exporting all implementations |

## Schema Triggers

- **Always generated** for contexts where `shouldGenerateImpls()` returns true (contexts with operations)
- One scaffold file per command, query, or function

## Example

### Generated Output

The scaffold provides the handler signature with dependency injection — the developer fills in the business logic:

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
          // Verify preconditions
          const user = yield* userRepo.findById(params.userId);
          if (!user) {
            return yield* Effect.fail(
              new UserNotFoundError({ message: "User not found" }),
            );
          }

          // Generate ID and create
          const id = yield* idGen.generate();
          const todo = {
            id: todoId(id),
            title: params.title,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: options.priority ?? "medium",
            tags: options.tags ?? [],
          };

          yield* todoRepo.save(todo);
          return todo;
        }),
    };
  }),
);
```

### Workflow

1. `morph generate` creates the scaffold with the correct types and dependencies
2. Developer implements the business logic inside the `handle` function
3. On regeneration, existing impl files are preserved (not overwritten)

## Testing

Implementation correctness is verified through scenario and property tests that run against the composed `HandlersLayer`. See the [testing README](../../testing/README.md).
