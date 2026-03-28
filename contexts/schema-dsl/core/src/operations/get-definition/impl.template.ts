// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslLocation } from "@morph/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetDefinitionHandler } from "./handler";

/**
 * Implementation of getDefinition function.
 * Get go-to-definition location for a symbol at a position in a .morph source file
 */
export const GetDefinitionHandlerLive = Layer.succeed(GetDefinitionHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement getDefinition
			// Params: column, line, source
			return yield* Effect.succeed({} as DslLocation);
		}),
});
