// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// API key for authentication
export const ApiKeySchema = S.Struct({
	id: S.String,
	keyHash: S.String,
	userId: S.String,
	name: S.optional(S.String),
	createdAt: S.String,
	expiresAt: S.optional(S.String),
	lastUsedAt: S.optional(S.String),
});

export type ApiKey = S.Schema.Type<typeof ApiKeySchema>;

export const parseApiKey = S.decodeUnknownSync(ApiKeySchema);
export const parseApiKeyEither = S.decodeUnknownEither(ApiKeySchema);
export const encodeApiKey = S.encodeSync(ApiKeySchema);

// API key with the plaintext secret (only returned on creation)
export const ApiKeyWithSecretSchema = S.Struct({
	id: S.String,
	key: S.String,
	userId: S.String,
	name: S.optional(S.String),
	createdAt: S.String,
	expiresAt: S.optional(S.String),
});

export type ApiKeyWithSecret = S.Schema.Type<typeof ApiKeyWithSecretSchema>;

export const parseApiKeyWithSecret = S.decodeUnknownSync(
	ApiKeyWithSecretSchema,
);
export const parseApiKeyWithSecretEither = S.decodeUnknownEither(
	ApiKeyWithSecretSchema,
);
export const encodeApiKeyWithSecret = S.encodeSync(ApiKeyWithSecretSchema);

// Function Schemas (pure transformations)

import {
	ApiKeyExpiredError,
	ApiKeyInvalidError,
	ApiKeyStorageError,
} from "./errors";

// Create a new API key for a user
export const CreateApiKeyInputSchema = S.Struct({
	userId: S.String,
	name: S.optional(S.String),
	expiresInSeconds: S.optional(S.Number),
});

export type CreateApiKeyInput = S.Schema.Type<typeof CreateApiKeyInputSchema>;
export type CreateApiKeyOutput = ApiKeyWithSecret;
export type CreateApiKeyError = ApiKeyStorageError;

// Validate an API key and return associated metadata
export const ValidateApiKeyInputSchema = S.Struct({
	key: S.String,
});

export type ValidateApiKeyInput = S.Schema.Type<
	typeof ValidateApiKeyInputSchema
>;
export type ValidateApiKeyOutput = ApiKey;
export type ValidateApiKeyError = ApiKeyInvalidError | ApiKeyExpiredError;

// Revoke (delete) an API key
export const RevokeApiKeyInputSchema = S.Struct({
	keyId: S.String,
});

export type RevokeApiKeyInput = S.Schema.Type<typeof RevokeApiKeyInputSchema>;
export type RevokeApiKeyOutput = void;
export type RevokeApiKeyError = ApiKeyStorageError;
