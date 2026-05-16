// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { GenerationResult } from "@morphdsl/generation-dsl";

import { InvalidSchemaError } from "@morphdsl/generation-dsl";
import { Effect } from "effect";

/**
 * Implementation of newProject function.
 * Create a new morph project (init + generate)
 */
export const newProject = (
	params: { readonly name: string; readonly schema: string },
	_options: Record<string, never>,
): Effect.Effect<GenerationResult, InvalidSchemaError> =>
	Effect.gen(function* () {
		// Params: name, schema
		return yield* Effect.fail(
			new InvalidSchemaError({ message: "Not implemented" }),
		);
	});
