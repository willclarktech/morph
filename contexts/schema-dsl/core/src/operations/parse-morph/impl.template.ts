// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { Effect, Layer } from "effect";

import { ParseMorphHandler } from "./handler";

/**
 * Implementation of parseMorph function.
 * Parse and compile a .morph DSL source to domain schema JSON
 */
export const ParseMorphHandlerLive = Layer.succeed(ParseMorphHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement parseMorph
			// Params: source
			return yield* Effect.fail(
				new ParseFailedError({ message: "Not implemented" }),
			);
		}),
});
