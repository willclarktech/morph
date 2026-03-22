// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.

import type { GenerationResult } from "@morph/generation-dsl";

import { Effect, Layer } from "effect";

import { InitHandler } from "./handler";
/**
 * Implementation of init function.
 * Initialize a new morph monorepo scaffold
 */
export const InitHandlerLive = Layer.succeed(InitHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement init
			// Params: name
			return yield* Effect.succeed({} as GenerationResult);
		}),
});
