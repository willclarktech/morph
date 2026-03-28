// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morph/generation-dsl";
import { Effect, Layer } from "effect";

import { ValidateHandler } from "./handler";

/**
 * Implementation of validate function.
 * Validate a domain schema
 */
export const ValidateHandlerLive = Layer.succeed(ValidateHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement validate
			// Params: schema
			return yield* Effect.fail(
				new InvalidSchemaError({ message: "Not implemented" }),
			);
		}),
});
