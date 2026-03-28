// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morph/generation-dsl";
import { Effect, Layer } from "effect";

import { NewProjectHandler } from "./handler";

/**
 * Implementation of newProject function.
 * Create a new morph project (init + generate)
 */
export const NewProjectHandlerLive = Layer.succeed(NewProjectHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement newProject
			// Params: name, schema
			return yield* Effect.fail(
				new InvalidSchemaError({ message: "Not implemented" }),
			);
		}),
});
