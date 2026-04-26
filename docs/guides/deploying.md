# Deploying a Generated App

Generated projects ship with a `Procfile` at the root and a `Dockerfile` in each app package. There is no opinion baked in about *where* you deploy — the artifacts are standard.

## Local development

Run an app directly inside the workspace:

```sh
bun run --filter '@pastebin/api' start
bun run --filter '@pastebin/ui' start
```

Both pick up the configured storage/auth backends from environment variables (see [Extensions](../architecture/extensions.md)).

## Docker

Each app package has its own multi-stage Dockerfile. From the project root:

```sh
docker build -f apps/api/Dockerfile -t pastebin-api .
docker run --rm -p 3000:3000 -e PASTEBIN_STORAGE=memory pastebin-api
```

The build context is the project root because the multi-stage build needs the workspace lockfile. The image is `oven/bun:1-alpine` based; expect ~80MB compressed.

For SQLite/Redis-backed deployments, set the relevant env var (e.g. `PASTEBIN_STORAGE=redis`, `PASTEBIN_REDIS_URL=...`) — see [Extensions](../architecture/extensions.md) for the full list.

## Procfile-based platforms (Fly.io, Railway, Render, Heroku)

The generated `Procfile` declares one process per app:

```
web: bun run --filter '@pastebin/api' start
ui: bun run --filter '@pastebin/ui' start
```

Most Procfile-aware platforms will pick this up automatically. For Fly.io specifically:

```sh
cd pastebin
fly launch                            # one-time, generates fly.toml
fly secrets set PASTEBIN_STORAGE=sqlite
fly deploy
```

For Railway: `railway up` from the project root, then set env vars in the dashboard.

## Configuration

Every backend selection is an env var. Conventions:

- `<APP>_STORAGE` — `memory`, `jsonfile`, `sqlite`, `redis`, or `eventsourced`
- `<APP>_AUTH` — `none`, `jwt`, `session`, `apikey`, `password`
- `<APP>_EVENT_STORE` — `memory`, `jsonfile`, `redis`
- Backend-specific settings: `<APP>_REDIS_URL`, `<APP>_SQLITE_PATH`, etc.

`<APP>` is the schema's `domain` name uppercased and underscored. Run with no env vars set and the app prints the env vars it expected.

## What isn't generated

- A reverse proxy / TLS terminator — front the API with whatever your platform provides.
- Database migrations beyond `schema.json` consumption — for SQLite the runtime creates tables on first run; for relational migrations beyond that you're on your own.
- Observability (metrics, traces) — logs go to stdout (Effect logger); wire them through your platform's log pipeline.
