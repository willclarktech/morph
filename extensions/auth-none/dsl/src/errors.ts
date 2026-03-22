// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Authentication is not enabled for this endpoint
 */
export class NoAuthEnabledError extends Data.TaggedError("NoAuthEnabledError")<{
	readonly message: string;
}> {}

/**
 * Union of all authNone context errors.
 */
export type AuthNoneError = NoAuthEnabledError;
