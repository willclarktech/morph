// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// JWT token payload (claims)
export const JwtPayloadSchema = S.Struct({
	sub: S.String,
	iat: S.Number,
	exp: S.optional(S.Number),
	aud: S.optional(S.String),
	iss: S.optional(S.String),
});

export type JwtPayload = S.Schema.Type<typeof JwtPayloadSchema>;

export const parseJwtPayload = S.decodeUnknownSync(JwtPayloadSchema);
export const parseJwtPayloadEither = S.decodeUnknownEither(JwtPayloadSchema);
export const encodeJwtPayload = S.encodeSync(JwtPayloadSchema);

// Function Schemas (pure transformations)

import type { TokenExpiredError, TokenInvalidError } from "./errors";

// Sign a JWT token with a secret
export const SignTokenInputSchema = S.Struct({
	payload: JwtPayloadSchema,
	secret: S.String,
});

export type SignTokenInput = S.Schema.Type<typeof SignTokenInputSchema>;
export type SignTokenOutput = string;

// Verify a JWT token and extract payload
export const VerifyTokenInputSchema = S.Struct({
	token: S.String,
	secret: S.String,
});

export type VerifyTokenInput = S.Schema.Type<typeof VerifyTokenInputSchema>;
export type VerifyTokenOutput = JwtPayload;
export type VerifyTokenError = TokenInvalidError | TokenExpiredError;

// Refresh an existing JWT token with new expiration
export const RefreshTokenInputSchema = S.Struct({
	token: S.String,
	secret: S.String,
});

export type RefreshTokenInput = S.Schema.Type<typeof RefreshTokenInputSchema>;
export type RefreshTokenOutput = string;
export type RefreshTokenError = TokenInvalidError | TokenExpiredError;
