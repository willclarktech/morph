// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to encode value
 */
export class CodecEncodeError extends Data.TaggedError("CodecEncodeError")<{
	readonly format: string;
	readonly message: string;
}> {}

/**
 * Failed to decode body
 */
export class CodecDecodeError extends Data.TaggedError("CodecDecodeError")<{
	readonly format: string;
	readonly message: string;
}> {}

/**
 * No codec available for requested format
 */
export class CodecNegotiationError extends Data.TaggedError(
	"CodecNegotiationError",
)<{
	readonly requested: string;
	readonly available: readonly string[];
}> {}

/**
 * Union of all codec context errors.
 */
export type CodecError =
	| CodecDecodeError
	| CodecEncodeError
	| CodecNegotiationError;
