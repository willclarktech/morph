// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morph/schema-dsl-dsl";
import { Effect, Layer } from "effect";

import { DecompileSchemaHandler } from "./handler";

/**
 * Implementation of decompileSchema function.
 * Convert a domain schema JSON to .morph DSL text
 */
export const DecompileSchemaHandlerLive = Layer.succeed(
	DecompileSchemaHandler,
	{
		handle: (_params, _options) =>
			Effect.gen(function* () {
				// TODO: Implement decompileSchema
				// Params: schema
				return yield* Effect.fail(
					new InvalidSchemaError({ message: "Not implemented" }),
				);
			}),
	},
);
