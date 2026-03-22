# @morph/schema-dsl-core

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

```typescript
import { decompileSchema, MockHandlersLayer } from "@morph/schema-dsl-core";
import { Effect } from "effect";

const result = await Effect.runPromise(
	decompileSchema
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
