# @morphdsl/schema-dsl-core

Parser, compiler, and language services for the `.morph` DSL.

Where `@morphdsl/generation-core` turns a parsed schema into code, this package turns `.morph` source text into a parsed schema. It also provides the language-server-style operations the VS Code extension and MCP server use to power editor features (diagnostics, completions, hover, go-to-definition, document symbols, folding ranges).

## Direct use

```ts
import { ops, HandlersLayer } from "@morphdsl/schema-dsl-core";
import { Effect } from "effect";

const program = Effect.gen(function* () {
	const result = yield* ops.parseMorph({ source: morphSourceText });
	return result.schema; // canonical JSON DomainSchema
});

const schema = await Effect.runPromise(
	program.pipe(Effect.provide(HandlersLayer)),
);
```

## Operations

- `parseMorph` — parse `.morph` source to a canonical JSON `DomainSchema`
- `decompileSchema` — round-trip JSON → `.morph` text
- `formatDsl` — pretty-print `.morph` source (parse + re-emit)
- `validateDsl` — parse-only validation
- `templateSchema` — emit a starter schema covering the available DSL features
- `getDiagnostics` — errors and warnings at file scope
- `getCompletions` — context-aware completions at a position
- `getHover` — hover information at a position
- `getDefinition` — go-to-definition target
- `getSymbols` — document outline
- `getFoldingRanges` — fold regions

The full set of operations matches what `@morphdsl/cli` exposes under the `schema-dsl:*` namespace and what `@morphdsl/mcp` registers as MCP tools.

## Errors

| Error                | Description                    |
| -------------------- | ------------------------------ |
| `InvalidSchemaError` | The input schema is malformed  |
| `ParseFailedError`   | The source could not be parsed |

## Where to look

- `src/operations/` — operation definitions and handler interfaces
- Implementations live in `@morphdsl/schema-dsl-impls` (parser via `@morphdsl/schema-dsl-parser`, compiler via `@morphdsl/schema-dsl-compiler`)
- For the DSL surface, see the [DSL Reference](https://github.com/willclarktech/morph/blob/main/docs/guides/dsl-reference.md)

Part of [Morph](https://github.com/willclarktech/morph) — algebraic code generation from domain schemas.
