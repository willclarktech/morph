// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to hash password
 */
export class PasswordHashError extends Data.TaggedError("PasswordHashError")<{
	readonly message: string;
}> {}

/**
 * Failed to verify password
 */
export class PasswordVerifyError extends Data.TaggedError(
	"PasswordVerifyError",
)<{
	readonly message: string;
}> {}

/**
 * Union of all authPassword context errors.
 */
export type AuthPasswordError = PasswordHashError | PasswordVerifyError;
