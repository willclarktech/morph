// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * API key is invalid (not found or bad format)
 */
export class ApiKeyInvalidError extends Data.TaggedError("ApiKeyInvalidError")<{
	readonly reason: string;
}> {}

/**
 * API key has expired
 */
export class ApiKeyExpiredError extends Data.TaggedError("ApiKeyExpiredError")<{
	readonly keyId: string;
}> {}

/**
 * Error reading or writing API key storage
 */
export class ApiKeyStorageError extends Data.TaggedError("ApiKeyStorageError")<{
	readonly message: string;
}> {}

/**
 * Union of all authApikey context errors.
 */
export type AuthApikeyError =
	| ApiKeyExpiredError
	| ApiKeyInvalidError
	| ApiKeyStorageError;
