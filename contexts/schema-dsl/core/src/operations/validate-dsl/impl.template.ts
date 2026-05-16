// Template for implementing the function.
// Copy to your impls package and implement the logic.
import { ParseFailedError } from "@morphdsl/schema-dsl-dsl";
import { Effect } from "effect";

/**
 * Implementation of validateDsl function.
 * Validate a .morph DSL source file
 */
export const validateDsl = (
	params: { readonly source: string },
	_options: Record<string, never>,
): Effect.Effect<void, ParseFailedError> =>
	Effect.gen(function* () {
		// Params: source
		return yield* Effect.fail(
			new ParseFailedError({ message: "Not implemented" }),
		);
	});
