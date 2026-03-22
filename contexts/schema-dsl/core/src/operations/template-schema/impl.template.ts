// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.

import { Effect, Layer } from "effect";

import { TemplateSchemaHandler } from "./handler";
/**
 * Implementation of templateSchema function.
 * Get a template .morph schema showing all available DSL features and field types
 */
export const TemplateSchemaHandlerLive = Layer.succeed(TemplateSchemaHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement templateSchema
			// Params:
			return yield* Effect.succeed({} as string);
		}),
});
