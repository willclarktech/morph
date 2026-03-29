# API

Generates a REST API server using `Bun.serve()` with auto-routed endpoints, OpenAPI spec, bearer token auth, SSE event streaming, and multi-backend storage.

## What It Generates

| File | Purpose |
|------|---------|
| `src/index.ts` | `Bun.serve()` entry point with route composition and layer wiring |
| `openapi.json` | OpenAPI 3.0 spec generated from schema |
| `.env.example` | Environment variable documentation |
| `Dockerfile` | Production container image |
| `src/test/scenarios.test.ts` | Scenario tests running against the HTTP API |

## Schema Triggers

- **Tag:** `@api` — operations tagged `@api` become API endpoints
- **Auth:** when `extensions.auth` is configured, generates bearer token auth with login route
- **Events:** when commands emit events, enables SSE streaming at `/events`
- **Storage:** backends from `extensions.storage` are resolved at runtime via env vars

## Example

### Schema Input

```morph
command createTodo @api @cli {
  params { title: String, userId: UserId }
  returns Todo
}

query listTodos @api @cli {
  params { userId: UserId, includeCompleted?: Boolean }
  returns Todo[]
}
```

### Generated Output

**src/index.ts** (excerpt):

```typescript
import { createApi, createSimpleBearerStrategy, createSseManager } from "@morphdsl/runtime-api";
import { HandlersLayer, ops, resolveStorage, resolveEventStore } from "@todo-app/tasks-core";

const injectableParams = {
  createTodo: [{ paramName: "userId", contextPath: "currentUser.id", invariantName: "UserIdMatchesCurrentUser" }],
  listTodos:  [{ paramName: "userId", contextPath: "currentUser.id", invariantName: "UserIdMatchesCurrentUser" }],
};

const main = Effect.gen(function* () {
  const eventStoreLayer = yield* resolveEventStore({ envPrefix: "TODO_APP" });
  const storageLayer = yield* resolveStorage({ envPrefix: "TODO_APP" });
  const AppLayer = Layer.mergeAll(storageLayer, eventStoreLayer, HandlersLayer, /* ... */);

  const api = createApi(ops, AppLayer, {
    auth: authStrategy,
    basePath: "/api",
    injectableParams,
    port: 3000,
    sse: { enabled: true },
  });
});
```

### Running It

```bash
$ bun run --filter @todo-app/api start
# Listening on http://localhost:3000

$ curl -s http://localhost:3000/api/todos -H "Authorization: Bearer <token>" | jq
[
  {
    "id": "a1b2c3d4-...",
    "title": "Buy milk",
    "completed": false,
    "priority": "medium",
    "userId": "e5f6g7h8-..."
  }
]
```

**OpenAPI spec** is served and generated with typed schemas for all entities and error responses.

## Testing

The API target has a scenario runner that starts a real HTTP server and executes scenarios via HTTP requests. Tests run with `bun test` in the `apps/api/` package.

See the [testing README](../../testing/README.md).
