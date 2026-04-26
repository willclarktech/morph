# @morphdsl/generation-core

The runtime entrypoint for Morph's code-generation context.

This package exposes the operations that turn a `.morph` schema into a complete monorepo (`generate`, `new-project`, `init`, `validate`) along with the Effect handler layers and operation registry that wire them together. It's the surface that both `@morphdsl/cli` and `@morphdsl/mcp` build on top of.

You typically interact with this package via:

- **`@morphdsl/cli`** — `bunx @morphdsl/cli generation:generate ...`
- **`@morphdsl/mcp`** — same operations exposed as MCP tools
- **Direct programmatic use** — see below

## Direct use

```ts
import { ops, HandlersLayer } from "@morphdsl/generation-core";
import { Effect } from "effect";

const program = Effect.gen(function* () {
	const result = yield* ops.generate({
		name: "my-app",
		schema: schemaText, // .morph source or schema JSON
	});
	return result.files;
});

const files = await Effect.runPromise(
	program.pipe(Effect.provide(HandlersLayer)),
);
```

`HandlersLayer` provides the live implementations (file-emitting). `MockHandlersLayer` provides arbitrary-data mocks suitable for property-based tests.

## Operations

- `generate` — produce all generated files for a schema
- `newProject` — generate a fresh monorepo (`generate` + scaffolding + schema files)
- `init` — emit just the monorepo scaffold (no code generation)
- `validate` — parse-only validation of a `.morph` schema

## Errors

| Error                | Description                    |
| -------------------- | ------------------------------ |
| `InvalidSchemaError` | The input schema is malformed  |
| `ParseFailedError`   | The source could not be parsed |

## Where to look

- `src/operations/` — operation definitions and handler interfaces
- Real implementations live in `@morphdsl/generation-impls`, which this package re-exports
- For the algebraic model behind generation, see [Algebraic Foundations](https://github.com/willclarktech/morph/blob/main/docs/concepts/algebraic-foundations.md)

Part of [Morph](https://github.com/willclarktech/morph) — algebraic code generation from domain schemas.
