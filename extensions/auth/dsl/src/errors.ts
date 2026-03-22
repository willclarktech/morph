// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Authentication required but not present or invalid
 */
export class AuthenticationError extends Data.TaggedError(
	"AuthenticationError",
)<{
	readonly code?: "EXPIRED_TOKEN" | "INVALID_TOKEN" | "UNAUTHENTICATED";
	readonly message: string;
}> {}

/**
 * User is authenticated but not authorized for this action
 */
export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
	readonly action?: string;
	readonly message: string;
	readonly resource?: string;
}> {}

/**
 * Union of all auth context errors.
 */
export type AuthError = AuthenticationError | AuthorizationError;
