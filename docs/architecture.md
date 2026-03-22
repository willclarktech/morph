# Monorepo Architecture

Morph is a code generation framework based on algebraic principles.

## Top-Level Structure

```
morph/
├── config/                  # Shared tooling configuration
│   ├── eslint/             # @morph/eslint-config
│   └── tsconfig/           # @morph/tsconfig
│
├── contexts/generation/     # Generation domain (schema, plugins, generators)
├── contexts/schema-dsl/     # Schema DSL (parser, compiler, decompiler)
├── extensions/              # Reusable infrastructure (auth, storage)
├── apps/                    # Morph's own apps (CLI, MCP, VSCode)
├── template/                # Scaffolding templates
├── examples/                # Generated example apps (gitignored)
├── docs/                    # Morph documentation
├── scripts/                 # Build and maintenance scripts
├── CLAUDE.md               # AI assistant instructions
├── TODO.md                 # Backlog
└── package.json            # Workspace configuration
```

## Generation Infrastructure

Morph has one domain context (generation) with modules organized by concern:

```
contexts/generation/
├── targets/                 # Generation targets (api, cli, mcp, ui, dsl, core, client, monorepo)
├── domain-schema/           # Core schema parsing and types
├── builders/                # Code builders (app, readme, test, scaffold)
├── generators/              # Cross-cutting generators
├── plugin/                  # Plugin system interface
└── utils/                   # Internal utilities
```

## Extensions

Reusable infrastructure that generated projects opt into via the `extensions` field in their schema:

```
extensions/
├── auth-password/           # Password hashing (dsl + impls)
├── auth-jwt/                # JWT auth (dsl + impls)
├── auth-session/            # Session auth (dsl + impls)
├── auth-apikey/             # API key auth (dsl + impls)
├── storage-memory/          # In-memory storage (dsl + impls)
├── storage-jsonfile/        # JSON file storage (dsl + impls)
├── storage-sqlite/          # SQLite storage (dsl + impls)
└── storage-redis/           # Redis storage (dsl + impls)
```

## Key Packages

| Package | Purpose |
|---------|---------|
| `@morph/domain-schema` | Schema parsing and types |
| `@morph/plugin` | Plugin system core |
| `@morph/plugin-*` | Generation plugins by output |
| `@morph/builder-*` | Reusable code builders |
| `@morph/scenario-runner-*` | Test runners by app type |
| `@morph/http-client` | Shared HTTP client for generated API clients |
| `@morph/scenario-runner` | Shared scenario runner infrastructure |
| `@morph/runtime-*` | Runtime libraries (api, cli, mcp) imported by generated apps |

## Shared Configuration

| Package | Purpose |
|---------|---------|
| `@morph/eslint-config` | ESLint configuration |
| `@morph/tsconfig` | TypeScript configuration |

## Workspace Configuration

The root `package.json` defines workspace globs:

```json
{
  "workspaces": [
    "config/*",
    "contexts/generation/*",
    "contexts/generation/builders/*",
    "contexts/generation/generators/*",
    "contexts/generation/testing/*",
    "contexts/generation/targets/*/generator",
    "contexts/generation/targets/*/plugin",
    "contexts/generation/targets/*/scenario-runner",
    "contexts/generation/targets/*/property-runner",
    "extensions/*/dsl",
    "extensions/*/impls",
    "examples/*/contexts/*/dsl",
    "examples/*/contexts/*/core",
    "examples/*/apps/*",
    "examples/*/tests/*",
    "apps/*",
    "libs/*",
    "tests/*"
  ]
}
```

## Scripts

```sh
bun run build:check       # Type check all packages
bun run lint              # Lint all packages
bun run lint:fix          # Fix lint issues
bun run format            # Check formatting
bun run format:fix        # Fix formatting
bun run generate:examples # Regenerate example apps
bun run test              # Run all tests
```

## Related Documentation

- `CLAUDE.md` - AI assistant instructions and coding guidelines
- `TODO.md` - Project backlog
- `docs/` - Morph documentation
