// Template for implementing the function.
// Copy to your impls package and implement the logic.
import { ParseFailedError } from "@morphdsl/schema-dsl-dsl";
import { Effect } from "effect";

/**
 * Implementation of formatDsl function.
 * Format .morph DSL source text (parse and re-emit)
 */
export const formatDsl = (
	params: { readonly source: string },
	_options: Record<string, never>,
): Effect.Effect<string, ParseFailedError> =>
	Effect.gen(function* () {
		// Params: source
		return yield* Effect.fail(
			new ParseFailedError({ message: "Not implemented" }),
		);
	});
