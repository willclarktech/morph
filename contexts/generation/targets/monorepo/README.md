# Monorepo

Generates the root monorepo configuration — README, Procfile, Docker files, architecture diagrams, and workspace setup.

## What It Generates

| File | Purpose |
|------|---------|
| `README.md` | Project documentation with quick-start, structure, scripts |
| `Procfile` | Process definitions for running app targets |
| `.dockerignore` | Docker build exclusions |
| `docs/` | Architecture diagrams (Mermaid) |
| `package.json` | Workspace root with shared scripts |
| `config/` | Shared ESLint and TypeScript configs |

## Schema Triggers

- **Always generated** as the root scaffold
- `Procfile` — only if any app target exists (`@api`, `@cli`, `@mcp`, `@ui`)
- `.dockerignore` — only if any app target has a Dockerfile
- `docs/` diagrams — generated from schema entities and relationships

## Example

### Generated Output

**Procfile:**

```
web: bun run --filter @todo-app/api start
ui: bun run --filter @todo-app/ui start
mcp: bun run --filter @todo-app/mcp start
```

**File tree:**

```
todo-app/
├── package.json          # Workspace root
├── Procfile              # Process definitions
├── README.md             # Generated documentation
├── .dockerignore
├── .editorconfig
├── .gitignore
├── bunfig.toml
├── config/
│   ├── eslint/           # Shared ESLint preset
│   └── tsconfig/         # Shared TypeScript config
├── apps/                 # Generated applications
│   ├── api/
│   ├── cli/
│   ├── cli-client/
│   ├── mcp/
│   └── ui/
├── contexts/             # Domain contexts
│   └── tasks/
│       ├── dsl/
│       └── core/
├── libs/
│   └── client/
└── tests/
    ├── scenarios/
    ├── properties/
    └── verification/
```

**package.json** (root):

```json
{
  "name": "@todo-app/root",
  "type": "module",
  "workspaces": ["config/*", "libs/*", "apps/*", "tests/*"],
  "scripts": {
    "build:check": "bun run --filter '*' build:check",
    "format": "bun run --filter '*' format",
    "lint": "bun run --filter '*' lint",
    "test": "bun run --filter '*' test"
  }
}
```
