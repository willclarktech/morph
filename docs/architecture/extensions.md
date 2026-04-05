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
      "providers": ["none", "inmemory", "test", "jwt", "session", "apikey"],
      "default": "jwt"
    },
    "eventStore": {
      "backends": ["memory", "jsonfile", "redis"],
      "default": "memory"
    },
    "encoding": {
      "formats": ["json", "yaml", "protobuf"],
      "default": "json"
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

### Auth

| Provider       | Description                                          |
| -------------- | ---------------------------------------------------- |
| `none`         | No authentication                                    |
| `inmemory`     | In-memory user store (development)                   |
| `test`         | Test user store with deterministic data              |
| `jwt`          | JSON Web Token authentication                        |
| `session`      | Session-based authentication                         |
| `apikey`       | API key authentication                               |

### Encoding

| Format     | Description                         |
| ---------- | ----------------------------------- |
| `json`     | JSON encoding/decoding              |
| `yaml`     | YAML encoding/decoding              |
| `protobuf` | Protocol Buffers encoding/decoding  |

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
├── auth/                  # Auth interfaces (shared by all auth providers)
├── auth-none/             # No-op auth provider
├── auth-password/         # Password hashing (with dsl/ and impls/)
├── auth-apikey/           # API key authentication
├── auth-jwt/              # JWT authentication
├── auth-session/          # Session-based authentication
├── codec/                 # Codec interfaces (shared by all formats)
├── codec-json/            # JSON encoding/decoding
├── codec-yaml/            # YAML encoding/decoding
├── codec-protobuf/        # Protocol Buffers encoding/decoding
├── eventstore/            # Event store interfaces
├── eventstore-memory/     # In-memory event store
├── eventstore-jsonfile/   # JSON file event store
├── eventstore-redis/      # Redis event store
├── storage/               # Storage interfaces
├── storage-memory/        # In-memory storage
├── storage-jsonfile/      # JSON file storage
├── storage-sqlite/        # SQLite storage
├── storage-redis/         # Redis storage
└── storage-eventsourced/  # Event-sourced storage (state from events)
```

Generated projects import from `@morphdsl/*-impls` packages.
