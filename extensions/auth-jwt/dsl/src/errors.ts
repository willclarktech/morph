// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * JWT token is invalid (malformed, bad signature, etc.)
 */
export class TokenInvalidError extends Data.TaggedError("TokenInvalidError")<{
	readonly reason: string;
}> {}

/**
 * JWT token has expired
 */
export class TokenExpiredError extends Data.TaggedError("TokenExpiredError")<{
	readonly expiredAt: string;
}> {}

/**
 * Union of all authJwt context errors.
 */
export type AuthJwtError = TokenExpiredError | TokenInvalidError;
