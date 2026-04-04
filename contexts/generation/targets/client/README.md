# Client

Generates a typed HTTP client library with method-per-operation, typed error unions, and auth header management. Used by the UI, CLI client, and scenario tests.

## What It Generates

| File | Purpose |
|------|---------|
| `src/client.ts` | `Client` interface and `createClient()` factory |
| `src/index.ts` | Barrel export |
| `src/test/scenarios.test.ts` | Scenario tests via HTTP client against a running API |

## Schema Triggers

- **Tag:** `@api` — generates client methods for operations tagged `@api`
- Routes are inferred from the same schema that drives the API target
- Error types imported from the DSL package

## Example

### Generated Output

**client.ts** — Typed client interface:

```typescript
import type { Todo, TodoId, User, UserId } from "@todo/tasks-dsl";
import type { HttpClientError } from "@morphdsl/http-client";

export interface Client {
  readonly completeTodo: (params: {
    readonly todoId: TodoId;
  }) => Effect.Effect<Todo, TodoNotFoundError | AlreadyCompletedError | HttpClientError>;

  readonly createTodo: (params: {
    readonly title: string;
    readonly priority?: "low" | "medium" | "high";
    readonly tags?: readonly string[];
  }) => Effect.Effect<Todo, UserNotFoundError | InvalidDueDateError | HttpClientError>;

  readonly listTodos: (params: {
    readonly includeCompleted?: boolean;
  }) => Effect.Effect<readonly Todo[], UserNotFoundError | HttpClientError>;

  readonly login: (params: {
    readonly email: string;
    readonly password: string;
  }) => Effect.Effect<User & { readonly token: string }, HttpClientError>;
}

export const createClient = (config: ClientConfig): Client => {
  const { baseUrl, token } = config;
  return {
    createTodo: (params) =>
      request<Todo>(`${baseUrl}/api/todos/create`, {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify(params),
      }),
    // ...
  };
};
```

### Usage

```typescript
const client = createClient({
  baseUrl: "http://localhost:3000",
  token: "user-jwt-token",
});

const todo = await Effect.runPromise(
  client.createTodo({ title: "Buy milk", priority: "high" }),
);
```

## Testing

The client target has a scenario runner that starts a real API server and runs scenarios through the HTTP client. See the [testing README](../../testing/README.md).
