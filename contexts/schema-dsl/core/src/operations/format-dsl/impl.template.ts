// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { ParseFailedError } from "@morph/schema-dsl-dsl";
import { Effect, Layer } from "effect";

import { FormatDslHandler } from "./handler";

/**
 * Implementation of formatDsl function.
 * Format .morph DSL source text (parse and re-emit)
 */
export const FormatDslHandlerLive = Layer.succeed(FormatDslHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement formatDsl
			// Params: source
			return yield* Effect.fail(
				new ParseFailedError({ message: "Not implemented" }),
			);
		}),
});
