# MCP

Generates a Model Context Protocol server for LLM tool integration. Operations become MCP tools callable via JSON-RPC over stdio.

## What It Generates

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server entry point with tool definitions and layer wiring |
| `.env.example` | Environment variable documentation |
| `Dockerfile` | Production container image |
| `src/test/scenarios.test.ts` | Scenario tests via MCP JSON-RPC protocol |

## Schema Triggers

- **Tag:** `@mcp` — operations tagged `@mcp` become MCP tools
- **Auth:** generates `createAuthInfoStrategy` for extracting user from MCP request context
- **Multi-context:** if multiple contexts are tagged `@mcp`, tool names are prefixed with context name
- **Events:** coordinates aggregate access descriptions added to tool descriptions

## Example

### Schema Input

```morph
command createTodo @api @mcp {
  params { title: String, userId: UserId }
  returns Todo
  coordinates { User: read, Todo: write }
}
```

### Generated Output

**src/index.ts** (excerpt):

```typescript
import { createAuthInfoStrategy, createMcp } from "@morphdsl/runtime-mcp";
import { HandlersLayer, ops, resolveStorage, resolveEventStore } from "@todo-app/tasks-core";
import { Effect, Layer, Logger } from "effect";

const authStrategy = createAuthInfoStrategy<{ id: string }>();

// MCP uses stdout for JSON-RPC, so redirect logs to stderr
const StderrLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.prettyLogger({ stderr: true }),
);

const main = Effect.gen(function* () {
  const AppLayer = /* ... layer composition ... */;

  const mcp = createMcp(ops, AppLayer, {
    name: "todo-app",
    version: "1.0.0",
    auth: authStrategy,
    injectableParams,
    descriptionSuffix: {
      createTodo: "Coordinates: User (read), Todo (write)",
      transferTodos: "Coordinates: User (read), Todo (write)",
    },
  });
});
```

### Running It

```bash
$ bun run --filter @todo-app/mcp start
# MCP server listening on stdio (JSON-RPC)

# Tools registered:
#   createTodo    - Create a new todo for a user. Coordinates: User (read), Todo (write)
#   completeTodo  - Mark a todo as completed.
#   deleteTodo    - Remove a todo from the system.
#   listTodos     - Get all todos for a user.
#   getTodo       - Get a single todo by ID.
#   transferTodos - Transfer all todos from one user to another.
#   createUser    - Register a new user in the system.
```

## Testing

The MCP target has a scenario runner that communicates with the server via JSON-RPC. See the [testing README](../../testing/README.md).
