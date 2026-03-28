// Effect TaggedError definitions
// Do not edit - regenerate from schema
import { Data } from "effect";

/**
 * The input schema is malformed
 * Occurs when: schema cannot be parsed or validated
 */
export class InvalidSchemaError extends Data.TaggedError("InvalidSchemaError")<{
	readonly message: string;
}> {}

/**
 * Union of all generation context errors.
 */
export type GenerationError = InvalidSchemaError;
