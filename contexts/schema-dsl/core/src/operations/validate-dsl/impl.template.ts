// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { Effect, Layer } from "effect";

import { ValidateDslHandler } from "./handler";

/**
 * Implementation of validateDsl function.
 * Validate a .morph DSL source file
 */
export const ValidateDslHandlerLive = Layer.succeed(ValidateDslHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement validateDsl
			// Params: source
			return yield* Effect.fail(
				new ParseFailedError({ message: "Not implemented" }),
			);
		}),
});
