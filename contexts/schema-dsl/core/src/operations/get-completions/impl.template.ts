// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslCompletion } from "@morph/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetCompletionsHandler } from "./handler";

/**
 * Implementation of getCompletions function.
 * Get context-aware completions at a position in a .morph source file
 */
export const GetCompletionsHandlerLive = Layer.succeed(GetCompletionsHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement getCompletions
			// Params: column, line, source
			return yield* Effect.succeed({} as readonly DslCompletion[]);
		}),
});
