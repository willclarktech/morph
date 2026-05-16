// Template for implementing the function.
// Copy to your impls package and implement the logic.
import type { ParseResult } from "@morphdsl/schema-dsl-dsl";

import { ParseFailedError } from "@morphdsl/schema-dsl-dsl";
import { Effect } from "effect";

/**
 * Implementation of parseMorph function.
 * Parse and compile a .morph DSL source to domain schema JSON
 */
export const parseMorph = (
	params: { readonly source: string },
	_options: Record<string, never>,
): Effect.Effect<ParseResult, ParseFailedError> =>
	Effect.gen(function* () {
		// Params: source
		return yield* Effect.fail(
			new ParseFailedError({ message: "Not implemented" }),
		);
	});
