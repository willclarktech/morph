// Template for implementing the function.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morphdsl/generation-dsl";
import { Effect } from "effect";

/**
 * Implementation of validate function.
 * Validate a domain schema
 */
export const validate = (
	params: { readonly schema: string },
	_options: Record<string, never>,
): Effect.Effect<void, InvalidSchemaError> =>
	Effect.gen(function* () {
		// Params: schema
		return yield* Effect.fail(
			new InvalidSchemaError({ message: "Not implemented" }),
		);
	});
