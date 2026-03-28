// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslHoverResult } from "@morph/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetHoverHandler } from "./handler";

/**
 * Implementation of getHover function.
 * Get hover information at a position in a .morph source file
 */
export const GetHoverHandlerLive = Layer.succeed(GetHoverHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement getHover
			// Params: column, line, source
			return yield* Effect.succeed({} as DslHoverResult);
		}),
});
