# Morph Demo Script

A guided demo of morph's algebraic foundations, building a real app from a domain provided by your audience.

**Duration:** ~60 minutes
**Prerequisites:** Morph repo with `bun install` done, Claude Code ready, VS Code with Mermaid preview

**See also:** [Algebraic Foundations](../concepts/algebraic-foundations.md) for the conceptual diagram

---

## Concepts Covered

| Concept | Step |
|---------|------|
| App spec as algebraic theory | 2 |
| Formalization → automatic projections | 3 |
| Free interpretation (DSL) | 4 |
| Prose for natural language | 5 |
| DSL → interfaces, mocks | 6 |
| Scenario testing | 7 |
| Non-free interpretation (Core) | 8 |
| Apps as natural transformations | 9–10 |

---

## Step 1: Capture the Domain

Ask your audience: *"Give me a simple app idea - 2-3 entity types and a few operations"*

Good examples: bookmark manager, recipe box, expense tracker, reading list

> "We're going to formalize this as a *theory* in the mathematical sense - sorts (types), operations, and equations (invariants). This formalization is the key that unlocks everything else."

---

## Step 2: Write the Schema

Have Claude Code write the schema:

```
Create a morph schema for a [audience's app idea].
Include:
- 2-3 entities with fields
- Commands that mutate state
- Queries that read state
- A pure function (no side effects)
- At least one invariant
- Domain errors
- Events emitted by commands

Save as examples/fixtures/{app-name}/schema.morph

After writing, validate with the morph MCP tool `generation_validate`
or the CLI: bun apps/cli/src/index.ts validate examples/fixtures/{app-name}/schema.morph

If validation fails, fix the schema and re-validate.
Keep iterating until the schema passes validation.
```

Explain the mapping as you go:

| Schema Element | Mathematical Concept |
|----------------|---------------------|
| `entities` | Sorts (carrier sets) |
| `valueObjects` | Product types |
| `commands` | Operations with effects |
| `queries` | Observations (read-only) |
| `functions` | Pure functions (stateless) |
| `events` | Observable consequences |
| `invariants` | Equations/axioms |
| `errors` | Partial function codomain |

> "This schema IS the theory. It's the actual mathematical object we're working with, not just documentation."

---

## Step 3: Generate and View Diagrams

```bash
bun run generate:examples {app-name}
code examples/{app-name}/docs/domain-model.md
```

Show the generated diagrams:
- Entity relationship diagram
- Operation flows
- Type hierarchy

> "Because we formalized the domain, diagrams are *computed*, not drawn. ERDs, flows, hierarchies - all projections of the same theory."

---

## Step 4: Explore the DSL

```bash
cat examples/{app-name}/contexts/*/dsl/src/schemas.ts
```

> "These are our sorts. Effect Schema gives us parse/validate/encode for free. The schema becomes runtime validation."

```bash
cat examples/{app-name}/contexts/*/dsl/src/index.ts
```

> "Operations are 'free' - they describe WHAT can happen, not HOW. `createBookmark.call({ url, title })` returns an OperationCall - a description of intent, not an execution."

> "The DSL is the *free interpretation*. Like a free group in algebra - it has the structure but no additional relations. We can manipulate operations as data."

---

## Step 5: Prose

Default prose is auto-generated from operation names (e.g., `createBookmark` becomes "creates a bookmark"). For custom prose, create a fixture:

```
Create examples/fixtures/{app-name}/dsl/prose.ts with format:
export const prose: Record<string, string> = {
  createBookmark: '{actor} creates bookmark "{title}" at {url}',
  deleteBookmark: '{actor} deletes bookmark "{title}"',
  // one template per operation...
};

Use {actor} for who's doing it, and {paramName} for operation parameters.
```

Show how prose renders in test output:

```
✓ User creates bookmark "GitHub" at https://github.com
✓ User deletes bookmark "GitHub"
```

> "Prose bridges the formal and the human. Operations are data, prose makes them readable. But the words are yours - they can't be generated from structure alone."

---

## Step 6: Run with Mocks

```bash
bun install
bun run --filter @{app-name}/cli start -- [list-operation]
```

> "We haven't written any implementation code yet - but the app runs! Mocks return random valid data. This proves the structure is complete before we commit to any real implementation."

Show the mock implementations:

```bash
cat examples/{app-name}/contexts/*/core/src/operations/*/mock-impl.ts
```

> "Mock implementations use fast-check arbitraries. They satisfy the interface with random valid data - great for testing and prototyping."

---

## Step 7: Write Scenarios

Have Claude Code write scenarios:

```
Write scenarios for {app-name} that test:
1. Happy path for each command
2. Error case (invalid input)
3. Invariant validation

Put them in examples/fixtures/{app-name}/scenarios/scenarios.ts
```

Regenerate and run them:

```bash
bun run generate:examples {app-name}
bun run --filter @{app-name}/cli test
```

> "Scenarios are executable specifications. One test suite, multiple interpretations. The same scenarios can test CLI, API, Client, or UI."

---

## Step 8: The Core Lib

```bash
cat examples/{app-name}/contexts/*/core/src/operations/*/handler.ts
```

> "This is where we make CHOICES. The free DSL said 'createBookmark exists'. The core says HOW - validate, persist, emit events."

```bash
cat examples/{app-name}/contexts/*/core/src/invariants/*.ts
```

> "Invariants from the schema become runtime validators. The equations become code."

> "Core is the PRIMARY interpretation. It's non-free because we've added relations - specific implementations, specific storage, specific validation logic."

---

## Step 9: Apps as Natural Transformations

Start the API:
```bash
bun run --filter @{app-name}/api start
curl -X POST localhost:3000/api/[operation] -H "Content-Type: application/json" -d '{...}'
```

> "API is a natural transformation: Core → HTTP. Every operation becomes an endpoint. Events stream via SSE."

Run the CLI:
```bash
bun run --filter @{app-name}/cli start -- [operation] --arg value
```

> "CLI: Core → Shell Commands. Same operations, different interface."

Show MCP and Client:
```bash
cat examples/{app-name}/apps/mcp/src/index.ts
cat examples/{app-name}/apps/cli-client/src/index.ts
```

> "MCP: Core → Tool Calls. Claude can use your domain as tools."
> "Client: API → TypeScript. Typed operations over HTTP."

> "All preserve structure. Schema command → core handler → POST endpoint → CLI command → MCP tool → client method. Natural transformations ensure nothing is lost."

---

## Step 10: Full Stack

```bash
# Terminal 1: API (port 3000)
bun run --filter @{app-name}/api start

# Terminal 2: UI (port 4000, connects to API)
bun run --filter @{app-name}/ui dev

# Terminal 3: Run scenarios against each transport
bun run --filter @{app-name}/api test
bun run --filter @{app-name}/cli test
```

Open http://localhost:4000 — register a user, create data, interact with it.

> "The UI is another natural transformation: Core → HTML. Server-rendered with HTMX for interactivity, Pico CSS for styling. Forms, tables, detail views, toggle switches - all derived from the schema."

> "Same scenarios, multiple interpretations, one test suite."

---

## Key Takeaways

| Point | Explanation |
|-------|-------------|
| Schema = Theory | Not documentation - the actual mathematical object |
| Formalization → Automation | Diagrams, types, validators, tests - all derived |
| Free vs Non-Free | DSL = structure, Core = implementation choices |
| Natural Transformations | Apps (API, CLI, UI, MCP) preserve algebraic structure |
| Single Source of Truth | Change schema, regenerate, everything updates |

---

## Common Questions

**"How is this different from code generation?"**
> Traditional codegen is ad-hoc templates. This is principled: we have a formal theory, and generation computes interpretations of that theory.

**"What if I need custom logic?"**
> The `impl.ts` files are yours. Morph generates the shell, you fill in domain logic. Regeneration preserves your implementations via the fixtures directory.

**"Can I use this for existing apps?"**
> Yes - write a schema for your domain, generate, then incrementally adopt the generated code.

**"What about the UI?"**
> The UI is fully generated from the schema - forms, tables, detail views, navigation. Boolean commands (like "complete") render as interactive toggle switches. Date fields get native date pickers. It uses HTMX + Pico CSS, no JavaScript framework required.
