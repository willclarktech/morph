# Authorization Design

## Authorization as Domain Invariants

Authorization rules ("who can do what") are domain knowledge. They belong in the schema as invariants that reference `context.currentUser`.

### Key Insight: Auth is Inferred

Authentication requirements are **derived** from authorization rules:

- If an invariant references `context.currentUser`, the operation needs an authenticated user
- The generator automatically emits `requireAuth()` before evaluating such invariants
- No explicit "isAuthenticated" condition needed

This cleanly separates:

- **Authorization** (domain): "Only the owner can delete a todo" → invariant in schema
- **Authentication** (infrastructure): "How do we identify the current user" → AuthService

---

## Schema Examples

### Ownership Invariant

```yaml
invariants:
  UserOwnsTodo:
    scope:
      kind: entity
      entity: Todo
    condition:
      kind: equals
      left: { kind: field, path: "todo.userId" }
      right: { kind: field, path: "context.currentUser.id" }
    violation: "You can only modify your own todos"
```

### Operation with Authorization

```yaml
operations:
  deleteTodo:
    input:
      todoId: TodoId
    pre:
      - UserOwnsTodo # Auth inferred from context.currentUser reference
    emits:
      - TodoDeleted
```

Since `UserOwnsTodo` references `context.currentUser`, the generator knows to:

1. Call `requireAuth()` to ensure a user is authenticated
2. Build the invariant context with the current user
3. Validate the ownership rule

### Operations Without Authorization

Operations without authorization rules don't require auth:

```yaml
operations:
  createUser: # Registration - no auth needed
    input:
      email: string
      name: string
    # No pre-invariants → no auth required
```

---

## AuthService Role

AuthService is a **context provider**, not a validator:

```typescript
interface AuthService<TUser = unknown> {
	readonly getCurrentUser: () => Effect.Effect<TUser | undefined>;
	readonly requireAuth: () => Effect.Effect<TUser, AuthenticationError>;
}
```

It answers "who is the current user?" The invariants answer "is this allowed?"

### Implementations

| Implementation              | Use Case                      |
| --------------------------- | ----------------------------- |
| `AuthServiceNone`           | Default, no auth required     |
| `makeAuthServiceTest(user)` | Testing with mock user        |
| `AuthServiceJWT`            | JWT token validation (future) |
| `AuthServiceApiKey`         | API key lookup (future)       |
| `AuthServiceSession`        | Session-based auth (future)   |

---

## Generated Code

### InvariantContext Type

```typescript
interface InvariantContext<TUser = unknown> {
	readonly currentUser: TUser | undefined;
	readonly operationName: string;
	readonly timestamp: string;
	readonly entities: Record<string, unknown>;
	readonly requestId?: string;
}
```

### Entity-Scoped Validator

```typescript
export const validateUserOwnsTodo = (
	todo: Todo,
	context: InvariantContext<User>,
): Effect.Effect<void, InvariantViolation> =>
	Effect.gen(function* () {
		const valid = todo.userId === context.currentUser?.id;
		if (!valid) {
			return yield* Effect.fail(
				new InvariantViolation({
					invariant: "UserOwnsTodo",
					message: "You can only modify your own todos",
					entity: "Todo",
					entityId: todo.id,
				}),
			);
		}
	});
```

### Operation with Inferred Auth

```typescript
export const deleteTodo = defineOperation({
  execute: (params, options) =>
    Effect.gen(function* () {
      const handler = yield* DeleteTodoHandler;
      const authService = yield* AuthService;

      // Auth is inferred from UserOwnsTodo referencing context.currentUser
      yield* authService.requireAuth();

      // Build invariant context
      const currentUser = yield* authService.getCurrentUser();
      const invariantContext: InvariantContext<User> = {
        currentUser,
        operationName: "deleteTodo",
        timestamp: new Date().toISOString(),
        entities: {},
      };

      // Load entity for ownership check
      const todoRepo = yield* TodoRepository;
      const todo = yield* todoRepo.findById(params.todoId).pipe(Effect.orDie);
      if (!todo) return yield* Effect.fail(new TodoNotFoundError(...));

      // Validate ownership
      yield* validateUserOwnsTodo(todo, invariantContext);

      // Execute handler
      return yield* handler.handle(params, options);
    }),
});
```

---

## Invariant Scopes

| Scope     | What it checks            | Depends on               |
| --------- | ------------------------- | ------------------------ |
| Entity    | Single entity constraints | Entity data              |
| Aggregate | Cross-entity constraints  | Related entities         |
| Operation | Pre/post conditions       | Operation params, result |
| Context   | Execution context         | Who, when, from where    |
| Global    | System-wide rules         | All data                 |

---

## Error Types

```typescript
class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  readonly message: string;
  readonly code?: "UNAUTHENTICATED" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
}>

class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string;
  readonly resource?: string;
  readonly action?: string;
}>
```

---

## Scope and Limitations

The auth inference mechanism is robust - it walks the condition AST looking for `context.currentUser` references. The real constraint is **what authorization patterns can be expressed in the condition algebra**.

### What Works Today

| Pattern                 | Example                                              | Supported |
| ----------------------- | ---------------------------------------------------- | --------- |
| Ownership               | `todo.userId === context.currentUser.id`             | Yes       |
| Scalar role check       | `context.currentUser.role === "admin"`               | Yes       |
| Existence in collection | `users.exists(u => u.id === context.currentUser.id)` | Yes       |
| Time-bounded access     | `context.timestamp < entity.expiresAt`               | Yes       |

### Current Limitations

| Pattern          | Issue                                        | Workaround                               |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| Role arrays      | No `contains`/`includes` operator            | Model as entity relationship             |
| Team membership  | Requires collection operators on currentUser | Flatten to `context.currentUser.teamIds` |
| Org hierarchy    | No graph traversal                           | External AuthorizationService            |
| Shared resources | Requires cross-entity lookup                 | Load in handler, check manually          |
| Dynamic policies | Can't express OPA/Cedar rules                | External policy engine                   |

### Inference Scales with the Algebra

The inference mechanism itself is fully general. When we add operators to the condition algebra, auth inference automatically works:

```yaml
# Future: if we add 'contains' operator
condition:
  kind: contains
  collection: { kind: field, path: "context.currentUser.roles" }
  value: { kind: literal, value: "editor" }
```

This would correctly infer auth because it references `context.currentUser`.

### When to Use External Authorization

Some patterns shouldn't be encoded in the schema:

1. **Graph-based permissions** (RBAC hierarchies, org trees) - Use an AuthorizationService
2. **Attribute-based access control** (ABAC) - External policy engine (OPA, Cedar)
3. **Dynamic/configurable policies** - Runtime policy evaluation
4. **Cross-aggregate authorization** - Service layer, not invariants

For these cases, the invariant can delegate to a service:

```typescript
// In handler implementation, not schema
const canAccess =
	yield *
	AuthorizationService.check({
		subject: currentUser,
		action: "delete",
		resource: todo,
	});
if (!canAccess) return yield * Effect.fail(new NotAuthorizedError());
```

The schema captures **domain authorization rules**. Complex access control policies belong in dedicated authorization infrastructure.

---

## Deployment-Level Auth

If a deployment (e.g., public API) wants blanket auth on all endpoints regardless of domain rules, that's infrastructure configuration, not domain schema. Configure at the API gateway or middleware level.
