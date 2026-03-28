// Effect TaggedError definitions
// Do not edit - regenerate from schema
import { Data } from "effect";

/**
 * The input is not valid domain schema JSON
 * Occurs when: schema cannot be parsed
 */
export class InvalidSchemaError extends Data.TaggedError("InvalidSchemaError")<{
	readonly message: string;
}> {}

/**
 * The source could not be parsed
 * Occurs when: source contains syntax errors
 */
export class ParseFailedError extends Data.TaggedError("ParseFailedError")<{
	readonly message: string;
}> {}

/**
 * Union of all schema-dsl context errors.
 */
export type SchemaDslError = InvalidSchemaError | ParseFailedError;
