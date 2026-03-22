# Morph

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

Install dependencies:

```bash
bun install
```

Run the CLI:

```bash
bun run --filter @Morph/cli start -- --help
```

Start the MCP server:

```bash
bun run --filter @Morph/mcp start
```

Build the extension:

```bash
cd apps/vscode && bun run build
```

Package as .vsix:

```bash
cd apps/vscode && bun run package
```

## Scripts

Run from the monorepo root:

```bash
bun run build:check  # Type-check all packages
bun run lint  # Lint all packages
bun run lint:fix  # Fix lint issues
bun run format  # Check formatting
bun run format:fix  # Fix formatting
bun run test  # Run all tests
```

## Project Structure

```
.
├── config/
│   ├── eslint/           # Shared ESLint config
│   └── tsconfig/         # Shared TypeScript config
├── libs/
│   ├── proto           # Protobuf message definitions and field mappings
├── apps/
│   ├── cli             # CLI
│   ├── mcp             # MCP server
│   └── vscode          # VSCode extension
├── tests/
│   └── scenarios/        # Behavior scenarios (Given/When/Then)
├── schema.json           # Domain schema + extensions
└── package.json          # Monorepo root
```

## Configuration

### Storage Backends

The `extensions.storage` field in `schema.json` defines available storage backends. Set the `MORPH_STORAGE` environment variable to select one at runtime:

```bash
MORPH_STORAGE=memory    # In-memory (default, data lost on restart)
MORPH_STORAGE=jsonfile  # JSON file persistence
MORPH_STORAGE=sqlite    # SQLite database
MORPH_STORAGE=redis     # Redis
```