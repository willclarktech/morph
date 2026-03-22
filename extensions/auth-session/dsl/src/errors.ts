// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Session does not exist
 */
export class SessionNotFoundError extends Data.TaggedError(
	"SessionNotFoundError",
)<{
	readonly sessionId: string;
}> {}

/**
 * Session has expired
 */
export class SessionExpiredError extends Data.TaggedError(
	"SessionExpiredError",
)<{
	readonly sessionId: string;
}> {}

/**
 * Failed to access session storage
 */
export class SessionStorageError extends Data.TaggedError(
	"SessionStorageError",
)<{
	readonly message: string;
}> {}

/**
 * Union of all authSession context errors.
 */
export type AuthSessionError =
	| SessionExpiredError
	| SessionNotFoundError
	| SessionStorageError;
