// Template for implementing the function.
// Copy to your impls package and implement the logic.
import { InvalidSchemaError } from "@morphdsl/schema-dsl-dsl";
import { Effect } from "effect";

/**
 * Implementation of decompileSchema function.
 * Convert a domain schema JSON to .morph DSL text
 */
export const decompileSchema = (
	params: { readonly schema: string },
	_options: Record<string, never>,
): Effect.Effect<string, InvalidSchemaError> =>
	Effect.gen(function* () {
		// Params: schema
		return yield* Effect.fail(
			new InvalidSchemaError({ message: "Not implemented" }),
		);
	});
