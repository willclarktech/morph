# @morph/generation-core

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

```typescript
import { generate, MockHandlersLayer } from "@morph/generation-core";
import { Effect } from "effect";

const result = await Effect.runPromise(
	generate
		.execute(
			{
				/* params */
			},
			{},
		)
		.pipe(Effect.provide(MockHandlersLayer)),
);
```

## Operations

## Errors

| Error                | Description                    |
| -------------------- | ------------------------------ |
| `InvalidSchemaError` | The input schema is malformed  |
| `ParseFailedError`   | The source could not be parsed |
