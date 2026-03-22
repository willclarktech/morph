# Execution Context in Morph

This document explains how execution context (authentication, request metadata, etc.) flows through morph-generated applications.

## The Reader Monad Pattern

In functional programming, the **Reader monad** represents computations that depend on an implicit environment. Rather than threading context through every function call:

```typescript
// Explicit parameter threading (verbose)
const createTodo = (title: string, userId: string, currentUser: User) => { ... }
const listTodos = (userId: string, currentUser: User) => { ... }
```

The Reader pattern provides context implicitly:

```typescript
// Reader monad (implicit environment)
const createTodo = (title: string, userId: string) =>
	Reader.ask((env) => {
		const currentUser = env.currentUser;
		// use currentUser implicitly
	});
```

## How Context Works in Morph

Morph uses **Effect services** as the TypeScript equivalent of Reader. The `AuthService` provides the "ask" operation:

```typescript
// In generated operation code
const createTodo = (params: CreateTodoParams) =>
	Effect.gen(function* () {
		const user = yield* AuthService.requireAuth(); // "ask" for context
		// user is now available without explicit param
	});
```

This maps directly to the Reader pattern:

- `AuthService.requireAuth()` = Reader's `ask` operation
- `Effect.provideService(AuthServiceTag, ...)` = Reader's `runReader`

## Pure Core, Impure Shell

Morph follows the principle of **pure core, impure shell**:

| Layer       | Pattern           | Why                                 |
| ----------- | ----------------- | ----------------------------------- |
| **Library** | Explicit params   | Testable, type-safe, no hidden deps |
| **API/CLI** | Context injection | Handles auth, injects values        |

### Library (Pure Core)

Library operations take explicit parameters:

```typescript
// libs/core/src/operations/create-todo.ts
export const createTodo = (params: { title: string; userId: UserId }) =>
	Effect.gen(function* () {
		// Pure business logic - userId is explicit
	});
```

Benefits:

- **Testing**: Pass values directly, no context setup required
- **Type safety**: Compiler enforces all required params
- **Clarity**: Clear what each operation needs
- **Reusability**: Works without Effect infrastructure

### Application (Impure Shell)

API/CLI handlers inject context before calling the library:

```typescript
// apps/api/src/handlers.ts
const handler = async (request: Request) => {
	const user = await extractUser(request); // Get user from request
	const params = extractParams(request);

	// Inject userId from context before calling pure library
	const injectedParams = { ...params, userId: user.id };

	return createTodo(injectedParams); // Call pure operation
};
```

## Inference from Invariants

Context dependencies are **inferred from invariants**, not declared explicitly.

### Auth Requirements

If an invariant references `context.currentUser`, the operation requires authentication:

```typescript
// In domain schema
invariants: [
	{
		name: "UserIdMatchesCurrentUser",
		scope: "pre",
		condition: equals(ref("input.userId"), ref("context.currentUser.id")),
	},
];
```

This invariant tells us:

1. The operation requires auth (references `context.currentUser`)
2. The `userId` param equals `context.currentUser.id` (injectable)

### Injectable Parameters

When an invariant constrains `input.X === context.Y`, the parameter can be auto-injected:

| Invariant                                  | Inference                      |
| ------------------------------------------ | ------------------------------ |
| `input.userId === context.currentUser.id`  | `userId` injectable from auth  |
| `input.ownerId === context.currentUser.id` | `ownerId` injectable from auth |

The API/CLI can:

- **Omit the param**: Auto-fill from context
- **Provide the param**: Validate it matches context

## Reader Monad vs Effect Services

| Concept              | Reader (Haskell) | Effect (TypeScript)                  |
| -------------------- | ---------------- | ------------------------------------ |
| Environment type     | `Reader r a`     | `Effect<A, E, R>` (R = requirements) |
| Ask for context      | `ask`            | `yield* SomeService`                 |
| Run with environment | `runReader env`  | `Effect.provide(layer)`              |
| Compose environments | `local f`        | `Layer.merge`                        |

Effect's service system is more powerful (supports multiple services, error handling, resource management) while maintaining the core Reader pattern of implicit environment access.

## Design Rationale

Why keep the library explicit while the application layer injects?

1. **Testing boundary**: Business logic should be testable with explicit inputs
2. **Separation of concerns**: Auth is an application concern, not domain logic
3. **Flexibility**: Same library works with different auth strategies
4. **Type safety**: No runtime surprises from missing context

The impure shell (API/CLI) is thin - it extracts context, injects params, and calls pure operations. All business logic lives in the pure core.
