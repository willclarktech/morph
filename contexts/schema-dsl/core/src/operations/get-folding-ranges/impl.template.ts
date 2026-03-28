// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslFoldingRange } from "@morph/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetFoldingRangesHandler } from "./handler";

/**
 * Implementation of getFoldingRanges function.
 * Get folding ranges for a .morph source file
 */
export const GetFoldingRangesHandlerLive = Layer.succeed(
	GetFoldingRangesHandler,
	{
		handle: (_params, _options) =>
			Effect.gen(function* () {
				// TODO: Implement getFoldingRanges
				// Params: source
				return yield* Effect.succeed({} as readonly DslFoldingRange[]);
			}),
	},
);
