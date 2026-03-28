# Extensions

Reusable infrastructure backends that generated projects opt into via the `extensions` field in their `.morph` schema.

## How Extensions Work

A schema declares which extension categories and backends it uses:

```morph
extensions {
  storage [memory, jsonfile, sqlite, redis] default memory
  auth [none, jwt, session, apikey] default none
  codec [json, yaml] default json
  eventStore [memory, jsonfile, redis] default memory
}
```

At runtime, the active backend is selected via environment variables. Generated code depends on extension interfaces, not concrete implementations — backends are swappable without code changes.

## Extension Categories

### Storage (6 packages)

| Extension | Description |
|-----------|-------------|
| `storage/` | Storage interface — defines the repository contract |
| `storage-memory/` | In-memory storage (default, no persistence) |
| `storage-jsonfile/` | JSON file storage (single-file persistence) |
| `storage-sqlite/` | SQLite storage (embedded database) |
| `storage-redis/` | Redis storage (networked key-value store) |
| `storage-eventsourced/` | Event-sourced storage (rebuild state from events) |

### Auth (6 packages)

| Extension | Description |
|-----------|-------------|
| `auth/` | Auth interface — defines the auth provider contract |
| `auth-none/` | No-op auth (no authentication) |
| `auth-password/` | Password hashing (hand-written library, not generated) |
| `auth-jwt/` | JWT token-based auth |
| `auth-session/` | Session-based auth |
| `auth-apikey/` | API key auth |

### Codec (4 packages)

| Extension | Description |
|-----------|-------------|
| `codec/` | Codec interface — defines serialization contract |
| `codec-json/` | JSON serialization |
| `codec-protobuf/` | Protocol buffer serialization |
| `codec-yaml/` | YAML serialization |

### Event Store (4 packages)

| Extension | Description |
|-----------|-------------|
| `eventstore/` | Event store interface — defines the event persistence contract |
| `eventstore-memory/` | In-memory event store |
| `eventstore-jsonfile/` | JSON file event store |
| `eventstore-redis/` | Redis event store |

## Package Structure

Each extension follows the `dsl/` + `impls/` pattern:

```
extensions/<category>-<backend>/
├── dsl/               # Generated types and schemas (do not edit)
│   ├── package.json
│   └── src/
├── impls/             # Hand-written implementation
│   ├── package.json
│   └── src/
├── schema.morph       # Extension schema definition
└── schema.json        # Compiled schema
```

- **`dsl/`** is generated — regenerate with `bun run regenerate:morph`, do not edit directly
- **`impls/`** is hand-written — this is where the backend logic lives
- Interface packages (`storage/`, `auth/`, `codec/`, `eventstore/`) define the contracts that backends implement

Exception: `auth-password/` is a standalone hand-written library without the `dsl/` + `impls/` split.

## Related Docs

- [Extensions](../docs/extensions.md) — runtime behavior, environment variables, selection logic
- [Architecture](../docs/architecture.md) — where extensions fit in the monorepo
