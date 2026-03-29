import type {
	ApiKey,
	ApiKeyStorageError,
	ApiKeyWithSecret,
} from "@morphdsl/auth-apikey-dsl";

import { ApiKeyExpiredError, ApiKeyInvalidError } from "@morphdsl/auth-apikey-dsl";
/**
 * API key storage with pluggable strategies.
 *
 * Default: In-memory store (suitable for development/testing).
 * For production, use setApiKeyStore() to configure a persistent backend.
 */
import { Effect } from "effect";

/**
 * API key store interface - pluggable storage backend.
 */
export interface ApiKeyStore {
	readonly getByHash: (
		keyHash: string,
	) => Effect.Effect<ApiKey | undefined, ApiKeyStorageError>;
	readonly getById: (
		keyId: string,
	) => Effect.Effect<ApiKey | undefined, ApiKeyStorageError>;
	readonly set: (apiKey: ApiKey) => Effect.Effect<void, ApiKeyStorageError>;
	readonly delete: (keyId: string) => Effect.Effect<void, ApiKeyStorageError>;
}

/**
 * In-memory API key store. Fast but not persistent.
 */
const createInMemoryApiKeyStore = (): ApiKeyStore => {
	const keysById = new Map<string, ApiKey>();
	const keysByHash = new Map<string, ApiKey>();

	return {
		getByHash: (keyHash) => Effect.sync(() => keysByHash.get(keyHash)),
		getById: (keyId) => Effect.sync(() => keysById.get(keyId)),
		set: (apiKey) =>
			Effect.sync(() => {
				keysById.set(apiKey.id, apiKey);
				keysByHash.set(apiKey.keyHash, apiKey);
			}),
		delete: (keyId) =>
			Effect.sync(() => {
				const apiKey = keysById.get(keyId);
				if (apiKey) {
					keysById.delete(keyId);
					keysByHash.delete(apiKey.keyHash);
				}
			}),
	};
};

let currentStore: ApiKeyStore = createInMemoryApiKeyStore();

/**
 * Set the API key store to use for all operations.
 * Call this at startup to configure persistent storage.
 */
export const setApiKeyStore = (store: ApiKeyStore): void => {
	currentStore = store;
};

/**
 * Reset to default in-memory store (useful for testing).
 */
export const resetApiKeyStore = (): void => {
	currentStore = createInMemoryApiKeyStore();
};

/**
 * Generate a cryptographically secure API key.
 * Format: prefix_randomBytes (e.g., "sk_abc123...")
 */
export const generateApiKey = (prefix = "sk"): string => {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	const base64 = btoa(String.fromCodePoint(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
	return `${prefix}_${base64}`;
};

/**
 * Hash an API key for storage using SHA-256.
 */
export const hashApiKey = async (key: string): Promise<string> => {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = new Uint8Array(hashBuffer);
	return btoa(String.fromCodePoint(...hashArray))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
};

/**
 * Check if an API key has expired.
 * undefined for expiresAt means no expiration.
 */
export const isApiKeyExpired = (apiKey: ApiKey): boolean => {
	if (apiKey.expiresAt === undefined) {
		return false;
	}
	return new Date(apiKey.expiresAt) < new Date();
};

/**
 * Create a new API key for a user.
 */
export const createApiKey = (
	userId: string,
	name?: string,
	expiresInSeconds?: number,
): Effect.Effect<ApiKeyWithSecret, ApiKeyStorageError> =>
	Effect.gen(function* () {
		const id = crypto.randomUUID();
		const key = generateApiKey();
		const keyHash = yield* Effect.promise(() => hashApiKey(key));
		const now = new Date();

		const expiresAt =
			expiresInSeconds === undefined
				? undefined
				: new Date(now.getTime() + expiresInSeconds * 1000).toISOString();

		const apiKey: ApiKey = {
			id,
			keyHash,
			userId,
			name,
			createdAt: now.toISOString(),
			expiresAt,
			lastUsedAt: undefined,
		};

		yield* currentStore.set(apiKey);

		return {
			id,
			key,
			userId,
			name,
			createdAt: apiKey.createdAt,
			expiresAt,
		};
	});

/**
 * Validate an API key and return associated metadata.
 */
export const validateApiKey = (
	key: string,
): Effect.Effect<
	ApiKey,
	ApiKeyInvalidError | ApiKeyExpiredError | ApiKeyStorageError
> =>
	Effect.gen(function* () {
		const keyHash = yield* Effect.promise(() => hashApiKey(key));
		const apiKey = yield* currentStore.getByHash(keyHash);

		if (apiKey === undefined) {
			return yield* Effect.fail(
				new ApiKeyInvalidError({ reason: "API key not found" }),
			);
		}

		if (isApiKeyExpired(apiKey)) {
			yield* currentStore.delete(apiKey.id);
			return yield* Effect.fail(new ApiKeyExpiredError({ keyId: apiKey.id }));
		}

		// Update last used timestamp
		const updatedApiKey: ApiKey = {
			...apiKey,
			lastUsedAt: new Date().toISOString(),
		};
		yield* currentStore.set(updatedApiKey);

		return updatedApiKey;
	});

/**
 * Revoke (delete) an API key.
 */
export const revokeApiKey = (
	keyId: string,
): Effect.Effect<void, ApiKeyStorageError> => currentStore.delete(keyId);
