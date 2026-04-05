# 12-Factor App Conformance

Morph generates applications that follow [The Twelve-Factor App](https://12factor.net/) methodology. This document explains how generated applications implement each factor.

## Summary

| Factor               | Status          | Implementation                           |
| -------------------- | --------------- | ---------------------------------------- |
| 1. Codebase          | **Implemented** | Single git repo with self-contained apps |
| 2. Dependencies      | **Implemented** | Explicit package.json with lockfile      |
| 3. Config            | **Implemented** | Environment variables + .env.example     |
| 4. Backing Services  | **Implemented** | Pluggable storage/event stores           |
| 5. Build/Release/Run | **Implemented** | Generated Dockerfiles                    |
| 6. Processes         | **Implemented** | Stateless request handlers               |
| 7. Port Binding      | **Implemented** | Self-contained Bun.serve()               |
| 8. Concurrency       | **Implemented** | Procfile + scaling patterns              |
| 9. Disposability     | **Implemented** | SIGTERM/SIGINT handlers                  |
| 10. Dev/Prod Parity  | **Implemented** | Production warnings for dev storage      |
| 11. Logs             | **Implemented** | Effect structured logging to stdout      |
| 12. Admin Processes  | **Implemented** | CLI commands + seed data                 |

---

## Factor 1: Codebase

> One codebase tracked in revision control, many deploys

Generated applications are self-contained monorepos with clear package boundaries:

```
my-app/
├── apps/
│   ├── api/          # REST API server
│   ├── cli/          # Command-line interface
│   ├── mcp/          # Model Context Protocol server
│   └── ui/           # Web UI
├── contexts/{context}/
│   ├── core/         # Business logic
│   └── dsl/          # Type definitions
├── libs/
│   └── client/       # HTTP client
└── tests/
    └── scenarios/    # BDD test specifications
```

---

## Factor 2: Dependencies

> Explicitly declare and isolate dependencies

All dependencies are declared in `package.json` files:

- External packages with explicit versions
- Workspace protocol (`workspace:*`) for internal dependencies
- Bun lockfile (`bun.lock`) ensures reproducible builds
- No implicit system dependencies

---

## Factor 3: Config

> Store config in the environment

Generated applications read configuration from environment variables:

| Variable            | Description                    | Default                 |
| ------------------- | ------------------------------ | ----------------------- |
| `PORT`              | Server port                    | 3000 (API), 4000 (UI)   |
| `{APP}_STORAGE`     | Storage backend                | `memory`                |
| `{APP}_EVENT_STORE` | Event store backend            | `memory`                |
| `{APP}_API_URL`     | API server URL (for UI/client) | `http://localhost:3000` |
| `NODE_ENV`          | Environment name               | `development`           |

Each app generates a `.env.example` documenting available variables:

```bash
# apps/api/.env.example
# Todo Environment Configuration
# Copy this file to .env and customize for your environment

# Storage backend (memory, jsonfile, sqlite, redis)
TODO_STORAGE=memory

# Event store backend (memory, jsonfile)
TODO_EVENT_STORE=memory

# Server port
PORT=3000

# Node environment (development, test, production)
NODE_ENV=development
```

---

## Factor 4: Backing Services

> Treat backing services as attached resources

Storage and event stores are pluggable via environment configuration:

```typescript
// Storage backends
const storageName = process.env["TODO_STORAGE"] ?? "memory";
const storageLayer = yield * getStorageLayer(storageName);

// Event store backends
const eventStoreName = process.env["TODO_EVENT_STORE"] ?? "memory";
const eventStoreLayer = yield * getEventStoreLayer(eventStoreName);
```

Available backends:

- **memory** - In-process (development/testing)
- **jsonfile** - File-based persistence
- **sqlite** - SQLite database
- **redis** - Redis (requires external service)

---

## Factor 5: Build, Release, Run

> Strictly separate build and run stages

Generated applications include Dockerfiles for containerized deployment:

### API Server

```dockerfile
# apps/api/Dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
# ... build stage ...

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}
CMD ["bun", "start"]
```

### CLI Binary

```dockerfile
# apps/cli/Dockerfile
FROM oven/bun:1-alpine AS builder
# ... build stage ...
RUN bun build apps/cli/src/index.ts --compile --outfile /app/my-app

FROM alpine:3.19
COPY --from=builder /app/my-app ./my-app
ENTRYPOINT ["./my-app"]
```

Build and run:

```bash
docker build -f apps/api/Dockerfile -t my-app-api .
docker run -p 3000:3000 -e MY_STORAGE=memory my-app-api
```

---

## Factor 6: Processes

> Execute the app as one or more stateless processes

All request handlers are stateless:

```typescript
// Each request creates fresh handler context
const handler = createHandlerWithRuntime(operation, runtime, auth);
```

State is stored in backing services (Factor 4), not in process memory.

---

## Factor 7: Port Binding

> Export services via port binding

Servers are self-contained via `Bun.serve()`:

```typescript
const server = Bun.serve({
    port: Number(process.env["PORT"] ?? 3000),
    routes: { ... }
});
```

No external web server (nginx, Apache) required.

---

## Factor 8: Concurrency

> Scale out via the process model

Generated applications declare process types via `Procfile`:

```
web: bun run --filter @my-app/api start
ui: bun run --filter @my-app/ui start
```

Each process type can be independently scaled. The API and UI servers are stateless (Factor 6), so horizontal scaling requires only shared backing services.

### Scaling patterns

**Shared storage requirement:** In-memory and jsonfile backends are single-process only. For multi-instance deployments, use a shared backend:

```bash
# Single instance (memory/jsonfile OK)
MY_STORAGE=jsonfile bun apps/api/src/index.ts

# Multi-instance (requires shared backend)
MY_STORAGE=redis bun apps/api/src/index.ts
MY_STORAGE=sqlite bun apps/api/src/index.ts
```

**SSE connection affinity:** The API server maintains in-memory SSE connections for real-time event streaming. Behind a load balancer, clients must reconnect to the same instance to receive their event stream. Configure sticky sessions on the `/api/events` path:

```nginx
upstream api {
    ip_hash;  # sticky sessions
    server api-1:3000;
    server api-2:3000;
}
```

**Health endpoint:** All API servers expose `GET /api/health` for load balancer health checks. Returns `200` when the server is ready to accept requests.

**Docker Compose multi-instance example:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    deploy:
      replicas: 3
    environment:
      - MY_STORAGE=redis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  ui:
    build:
      context: .
      dockerfile: apps/ui/Dockerfile
    ports:
      - "4000:4000"
    environment:
      - MY_API_URL=http://api:3000

  redis:
    image: redis:7-alpine

  nginx:
    image: nginx:alpine
    ports:
      - "3000:3000"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
```

---

## Factor 9: Disposability

> Maximize robustness with fast startup and graceful shutdown

All servers implement graceful shutdown on SIGTERM/SIGINT:

```typescript
// API Server
const { stop } = yield * Effect.promise(() => api.start());

const shutdown = () => {
	void stop().then(() => {
		process.exit(0);
	});
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

```typescript
// UI Server
const shutdown = () => {
	console.info("UI server shutting down...");
	void server.stop(true).then(() => {
		console.info("UI server stopped");
		process.exit(0);
	});
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

## Factor 10: Dev/Prod Parity

> Keep development, staging, and production as similar as possible

Generated applications warn when using development-only storage in production:

```typescript
// Factor 10: Warn if using memory storage in production
if (storageName === "memory" && process.env["NODE_ENV"] === "production") {
	console.warn(
		"⚠️  WARNING: Using in-memory storage in production. Data will be lost on restart.",
	);
	console.warn(
		"   Set TODO_STORAGE=jsonfile or redis for persistent storage.",
	);
}
```

This encourages using the same storage backend across environments.

---

## Factor 11: Logs

> Treat logs as event streams

Structured logging via Effect:

```typescript
yield *
	Effect.logInfo("Server started").pipe(
		Effect.annotateLogs({ port, storage: storageName }),
	);
```

- Logs written to stdout (API, UI, CLI)
- MCP servers use stderr (stdout reserved for JSON-RPC)
- No log file management in application code

---

## Factor 12: Admin Processes

> Run admin/management tasks as one-off processes

CLI applications provide CRUD commands as one-off admin processes:

```bash
my-app create-user --name "Alice"
my-app list-users
```

### Seed data

The `seed` command populates storage with deterministic test data using property-based testing arbitraries:

```bash
# Seed 10 entities per type (default)
my-app seed

# Seed 50 entities with a specific random seed
my-app seed --count 50 --seed 123
```

Seed data is generated from the same Effect Schema arbitraries used in property tests, ensuring generated values satisfy all domain invariants. The `--seed` flag makes output deterministic — the same seed always produces the same data.

---

## Verification

Test 12-factor conformance:

```bash
# 1. Build Docker image
docker build -f apps/api/Dockerfile -t my-app-api .

# 2. Run with production config
docker run -d --name my-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MY_STORAGE=jsonfile \
  my-app-api

# 3. Verify health check
curl http://localhost:3000/health

# 4. Test graceful shutdown
docker stop my-app  # Sends SIGTERM

# 5. Check logs
docker logs my-app
```
