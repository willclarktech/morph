// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morphdsl/generation-dsl";
import { Effect, Layer } from "effect";

import { GenerateHandler } from "./handler";

/**
 * Implementation of generate function.
 * Generate all packages from a domain schema
 */
export const GenerateHandlerLive = Layer.succeed(GenerateHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement generate
			// Params: name, schema
			return yield* Effect.fail(
				new InvalidSchemaError({ message: "Not implemented" }),
			);
		}),
});
