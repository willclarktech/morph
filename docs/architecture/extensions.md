# Schema Extensions

Infrastructure concerns like storage backends and auth providers are configured via the `extensions` field in the domain schema.

## Extensions in the Domain Schema

Declare extensions directly in `schema.json`:

```json
{
  "name": "Todo",
  "extensions": {
    "storage": {
      "backends": ["memory", "jsonfile", "sqlite", "redis"],
      "default": "memory"
    },
    "auth": {
      "providers": ["none", "inmemory", "test", "jwt"],
      "default": "jwt"
    },
    "eventStore": {
      "backends": ["memory", "jsonfile", "redis"],
      "default": "memory"
    },
    "i18n": {
      "languages": ["en", "de"],
      "baseLanguage": "en"
    }
  },
  "contexts": { ... }
}
```

## Runtime Config

Environment variables select which backend to use at runtime. They are prefixed with the app name (e.g., `todo` -> `TODO_`).

### Backend Selection

| Variable               | Description         | Example                         |
| ---------------------- | ------------------- | ------------------------------- |
| `{PREFIX}_STORAGE`     | Storage backend     | `TODO_STORAGE=redis`        |
| `{PREFIX}_EVENT_STORE` | Event store backend | `TODO_EVENT_STORE=jsonfile` |

### Backend-Specific Config

| Variable                     | Backend  | Description                                                          |
| ---------------------------- | -------- | -------------------------------------------------------------------- |
| `{PREFIX}_REDIS_URL`         | redis    | Redis connection string (falls back to `REDIS_URL`, then default)    |
| `{PREFIX}_DATA_FILE`         | jsonfile | Storage file path (default: `.test-data.json`)                       |
| `{PREFIX}_SQLITE_PATH`       | sqlite   | SQLite database path (default: `.data.sqlite`)                       |
| `{PREFIX}_EVENT_STORE_FILE`  | jsonfile | Event store file path (default: `.events.json`)                      |

## Available Backends

### Storage

| Backend        | Persistence | Use Case                                      |
| -------------- | ----------- | --------------------------------------------- |
| `memory`       | None        | Testing, development                          |
| `jsonfile`     | File        | Single-process apps, simple persistence       |
| `sqlite`       | File        | Embedded relational storage                   |
| `redis`        | External    | Production, multi-process                     |
| `eventsourced` | Via events  | Event-sourced entities, state from event store |

### Event Store

| Backend    | Persistence | Use Case                          |
| ---------- | ----------- | --------------------------------- |
| `memory`   | None        | Testing, development              |
| `jsonfile` | File        | Audit logs, simple event sourcing |
| `redis`    | External    | Production event streaming        |

## Extension Source Packages

Extension implementations live in `extensions/`:

```
extensions/
├── auth-password/         # Password hashing extension
│   ├── dsl/               # @morphdsl/auth-password-dsl
│   └── impls/             # @morphdsl/auth-password-impls
├── storage-memory/        # In-memory storage
├── storage-jsonfile/      # JSON file storage
├── storage-sqlite/        # SQLite storage
├── storage-redis/         # Redis storage
├── storage-eventsourced/  # Event-sourced storage (state from events)
└── ...
```

Generated projects import from `@morphdsl/*-impls` packages.
