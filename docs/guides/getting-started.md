# Getting Started

This guide walks through creating a pastebin app from a `.morph` schema. By the end, you'll have a REST API, CLI, and web UI — all generated from a single schema file.

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Git

## 1. Write Your Schema

Create a `schema.morph` file:

```morph
domain Pastebin

extensions {
  storage [memory, jsonfile, sqlite, redis] default memory
}

context pastes "Simple pastebin for sharing text snippets." {

  @root
  entity Paste "A text snippet shared via URL." {
    content: string "The paste content"
    createdAt: string "ISO date timestamp"
    title: string "Optional title"
  }

  @cli @api @ui
  command createPaste "Create a new paste."
    writes Paste
    input {
      content: string "The paste content"
      title?: string "Optional title"
    }
    output Paste
    emits PasteCreated "Emitted when a new paste is created"

  @cli @api @ui
  query listPastes "List all pastes."
    reads Paste
    input {}
    output Paste[]
}
```

Key concepts:
- **`domain`** names your project
- **`extensions`** declares infrastructure (storage backends, auth providers)
- **`context`** groups related entities and operations
- **`@root`** marks the aggregate root entity
- **`@cli @api @ui`** tags control which apps expose this operation
- **`command`** mutates state; **`query`** reads state

## 2. Generate the Project

```sh
morph new-project pastebin --schema-file schema.morph
```

Required arguments (`name`) are positional. The schema is passed via `--schema-file` since it's a file path rather than inline text.

This generates a complete monorepo:

```
pastebin/
├── apps/
│   ├── api/          # REST API server
│   ├── cli/          # Interactive CLI
│   └── ui/           # Web UI
├── contexts/pastes/
│   ├── core/         # Handler interfaces, services, layers
│   └── dsl/          # Types, schemas, operation descriptors
├── libs/client/      # HTTP client library
├── tests/scenarios/  # BDD tests
└── config/           # ESLint, TypeScript configs
```

## 3. Implement Handlers

The only code you write by hand. Each command/query gets a handler file in `contexts/pastes/core/src/operations/<name>/impl.ts`:

```typescript
// contexts/pastes/core/src/operations/create-paste/impl.ts

import { Effect, Layer } from "effect";
import type { Paste, PasteId } from "@pastebin/pastes-dsl";
import { IdGenerator, PasteRepository } from "../../services";
import { CreatePasteHandler } from "./handler";

export const CreatePasteHandlerLive = Layer.effect(
  CreatePasteHandler,
  Effect.gen(function* () {
    const idGen = yield* IdGenerator;
    const repo = yield* PasteRepository;

    return {
      handle: (params, options) =>
        Effect.gen(function* () {
          const id = (yield* idGen.generate()) as PasteId;
          const paste: Paste = {
            id,
            content: params.content,
            title: options.title ?? "",
            createdAt: new Date().toISOString(),
          };
          yield* repo.save(paste).pipe(Effect.orDie);
          return paste;
        }),
    };
  }),
);
```

Handlers receive:
- **`params`** — required input fields
- **`options`** — optional input fields
- **Services** via Effect dependency injection (`IdGenerator`, `PasteRepository`)

## 4. Run Your App

```sh
# Install dependencies
bun install

# Start the REST API (in-memory storage)
bun run apps/api/src/index.ts

# Or start the CLI
bun run apps/cli/src/index.ts

# Or start the UI
bun run apps/ui/src/index.ts
```

Switch storage backends via environment variables:

```sh
# Use SQLite
PASTEBIN_STORAGE=sqlite bun run apps/api/src/index.ts

# Use Redis
PASTEBIN_STORAGE=redis PASTEBIN_REDIS_URL=redis://localhost:6379 bun run apps/api/src/index.ts
```

## 5. Write Scenarios

Scenario tests verify behavior across all app targets:

```typescript
// tests/scenarios/src/scenarios.ts

import { assert, given, scenario, then, when } from "@morphdsl/scenario";
import { createPaste, listPastes } from "@pastebin/pastes-dsl";

export const scenarios = [
  scenario("Create a paste")
    .withActor("User")
    .steps(
      when(createPaste.call({ content: "Hello, World!" })).as("paste"),
      then(
        assert("paste", "content")
          .toBe("Hello, World!")
          .withProse("the paste content matches"),
      ),
    ),

  scenario("Create and list pastes")
    .withActor("User")
    .steps(
      given(createPaste.call({ content: "First", title: "First" })).as("p1"),
      when(listPastes.call({})).as("pastes"),
      then(assert("pastes").toHaveLength(1).withProse("one paste returned")),
    ),
];
```

Run tests:

```sh
bun test
```

The same scenarios run against the core library, CLI, and API — ensuring all targets behave identically.

## Next Steps

Explore the example suite for progressively advanced features:

| Example | Features |
|---------|----------|
| `cache-port` | Abstract ports, property-based contracts |
| `type-gallery` | Generics, discriminated unions, type aliases |
| `address-book` | Value objects, standalone errors, `@sensitive` |
| `code-generator` | Pure functions, unions — no entities or CRUD |
| `marketplace` | Multiple contexts, `depends on`, profiles |
| `delivery-tracker` | Entity relationships (`has_one`, `references`), post conditions |
| `blog` | Role-based auth, domain events, subscribers |
| `ledger` | Event-sourced storage, event store queries, transaction history |
| `todo` | Full-featured: auth, invariants, events, i18n, all five app targets |

Each example lives in `examples/fixtures/<name>/schema.morph` (source) and `examples/<name>/` (generated output).

Reference docs:

- **[DSL Reference](./dsl-reference.md)** — Full `.morph` syntax (invariants, events, relationships, generics)
- **[Extensions](../architecture/extensions.md)** — Configure auth, event stores, i18n
- **[Testing Philosophy](../concepts/testing-philosophy.md)** — Scenarios as algebraic laws
