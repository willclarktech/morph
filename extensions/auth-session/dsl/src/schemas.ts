// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Session data
export const SessionSchema = S.Struct({
	id: S.String,
	userId: S.String,
	createdAt: S.String,
	expiresAt: S.optional(S.String),
	data: S.optional(S.Unknown),
});

export type Session = S.Schema.Type<typeof SessionSchema>;

export const parseSession = S.decodeUnknownSync(SessionSchema);
export const parseSessionEither = S.decodeUnknownEither(SessionSchema);
export const encodeSession = S.encodeSync(SessionSchema);

// Function Schemas (pure transformations)

import type {
	SessionExpiredError,
	SessionNotFoundError,
	SessionStorageError,
} from "./errors";

// Create a new session for a user
export const CreateSessionInputSchema = S.Struct({
	userId: S.String,
	data: S.optional(S.Unknown),
	expiresInSeconds: S.optional(S.Number),
});

export type CreateSessionInput = S.Schema.Type<typeof CreateSessionInputSchema>;
export type CreateSessionOutput = Session;
export type CreateSessionError = SessionStorageError;

// Validate a session and return its data if valid
export const ValidateSessionInputSchema = S.Struct({
	sessionId: S.String,
});

export type ValidateSessionInput = S.Schema.Type<
	typeof ValidateSessionInputSchema
>;
export type ValidateSessionOutput = Session;
export type ValidateSessionError = SessionNotFoundError | SessionExpiredError;

// Destroy a session (logout)
export const DestroySessionInputSchema = S.Struct({
	sessionId: S.String,
});

export type DestroySessionInput = S.Schema.Type<
	typeof DestroySessionInputSchema
>;
export type DestroySessionOutput = undefined;
export type DestroySessionError = SessionStorageError;
