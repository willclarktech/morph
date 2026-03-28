# CLI

Generates a local CLI application with interactive commands, REPL support, auth prompts, and multi-backend storage selection.

## What It Generates

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point with command routing, auth layer, backend resolution |
| `src/seed.ts` | Database seeding utility |
| `.env.example` | Environment variable documentation |
| `Dockerfile` | Production container image |
| `src/test/scenarios.test.ts` | Scenario tests running CLI commands programmatically |
| `src/test/properties.test.ts` | Property tests for invariant validation |

## Schema Triggers

- **Tag:** `@cli` — operations tagged `@cli` become CLI commands
- **Auth:** when `extensions.auth` is configured, generates interactive email/password prompts (or reads from env vars in test mode)
- **Storage:** `--storage <name>` flag selects backend at runtime
- **Events:** `--event-store <name>` flag selects event store backend

## Example

### Schema Input

```morph
command completeTodo @api @cli {
  params { todoId: TodoId }
  returns Todo
  errors [TodoNotFoundError, AlreadyCompletedError]
}
```

### Generated Output

The CLI exposes each operation as a subcommand with typed arguments:

```typescript
const cli = createCli(ops, AppLayer, {
  name: "todo-app",
  auth: AuthLayer,
  injectableParams,
});
```

### Running It

```
$ bun run --filter @todo-app/cli start -- --help

todo-app

Usage: todo-app <command> [options]

Commands:
  complete-todo   Mark a todo as completed.
  create-todo     Create a new todo for a user.
  create-user     Register a new user in the system.
  delete-todo     Remove a todo from the system.
  get-todo        Get a single todo by ID.
  list-todos      Get all todos for a user.
  transfer-todos  Transfer all todos from one user to another.

Global options:
  --storage <name>       Storage backend (default: memory)
  --event-store <name>   Event store backend (default: memory)
  --help, -h             Show help

Run 'todo-app <command> --help' for more information.
```

## Testing

The CLI target has both scenario and property runners:

- **Scenarios** execute CLI commands programmatically and verify output
- **Properties** validate invariants using fast-check

See the [testing README](../../testing/README.md).
