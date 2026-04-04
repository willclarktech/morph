# CLI Client

Generates a thin remote CLI that dispatches commands to the API server over HTTP. No local business logic — just a typed client wrapper with persistent config and auth token storage.

## What It Generates

| File | Purpose |
|------|---------|
| `src/index.ts` | Remote CLI entry point with config management and HTTP dispatch |
| `.env.example` | Environment variable documentation |
| `Dockerfile` | Production container image |
| `src/test/scenarios.test.ts` | Scenario tests against a running API |

## Schema Triggers

- **Tag:** `@cli-client` — operations tagged `@cli-client` become remote commands
- **Depends on:** `lib-client` (the typed HTTP client library)
- **Auth:** generates `login` / `logout` / `config` subcommands for credential management

## Example

### Generated Output

The CLI client persists API URL and auth token locally:

```typescript
const config = createConfigManager("todo-client", "TODO_CLIENT");

commands.login = async (argv) => {
  const { token } = await client.login({ email, password });
  config.writeConfig({ ...current, token });
};

commands["create-todo"] = async (argv) => {
  const client = createClient(config.createClientConfig());
  const result = await client.createTodo({ title: argv[1] });
  console.log(JSON.stringify(result));
};
```

### Running It

```
$ bun run --filter @todo/cli-client start -- --help

todo-client - CLI client for remote API

Configuration:
  config --api-url <url>    Set API URL
  login --email <email>     Authenticate and store token
  logout                    Clear stored token

Commands:
  complete-todo <todo-id>          Mark a todo as completed.
  create-todo <title>              Create a new todo for a user.
  create-user <email> <name>       Register a new user in the system.
  delete-todo <todo-id>            Remove a todo from the system.
  get-todo <todo-id>               Get a single todo by ID.
  list-todos                       Get all todos for a user.

Environment:
  TODO_CLIENT_API_URL      Override API URL
  TODO_CLIENT_API_TOKEN    Override auth token
```

## Testing

The CLI client has a scenario runner that starts a real API server, then executes remote commands against it. See the [testing README](../../testing/README.md).
