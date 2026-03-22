/**
 * AuthServiceApiKey implementation generator.
 * Delegates to @morph/auth-apikey-impls for API key operations.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the API Key AuthService implementation.
 * Uses @morph/auth-apikey-impls for API key operations.
 */
export const generateAuthServiceApiKey = (
	_envPrefix: string,
): GeneratedFile => {
	const content = `// Generated AuthServiceApiKey implementation
// Delegates to @morph/auth-apikey-impls for API key operations
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";
import {
	createApiKey as createApiKeyImpl,
	validateApiKey as validateApiKeyImpl,
	revokeApiKey as revokeApiKeyImpl,
} from "@morph/auth-apikey-impls";

import { AuthenticationError } from "./auth-errors";
import type { AuthService } from "./auth-service";
import { AuthService as AuthServiceTag } from "./auth-service";

/**
 * Internal state for API key authentication.
 * Holds the user from the current request's API key.
 */
interface ApiKeyAuthState {
	readonly user: unknown | undefined;
}

let currentRequestState: ApiKeyAuthState = { user: undefined };

/**
 * Set the current request's authenticated user from API key.
 * Called by middleware/handlers before processing.
 */
export const setApiKeyUser = (user: unknown | undefined): void => {
	currentRequestState = { user };
};

/**
 * Extract API key from request header.
 */
export const extractApiKey = (
	request: Request,
	headerName = "X-API-Key",
): string | undefined => {
	return request.headers.get(headerName) ?? undefined;
};

/**
 * Validate an API key using the auth-apikey adapter.
 * Returns an Effect that resolves to the ApiKey record.
 */
export const validateApiKeyEffect = (key: string) =>
	validateApiKeyImpl(key);

/**
 * Create an API key using the auth-apikey adapter.
 * Returns an Effect that resolves to the ApiKeyWithSecret (includes plaintext key).
 */
export const createApiKeyEffect = (userId: string, name?: string) =>
	createApiKeyImpl(userId, name);

/**
 * Revoke an API key using the auth-apikey adapter.
 */
export const revokeApiKeyEffect = (keyId: string) =>
	revokeApiKeyImpl(keyId);

/**
 * Create an AuthService layer using API key authentication.
 */
export const createAuthServiceApiKey = <TUser>(): Layer.Layer<AuthService<TUser>> =>
	Layer.succeed(AuthServiceTag, {
		getCurrentUser: () => Effect.sync(() => currentRequestState.user as TUser | undefined),
		requireAuth: () =>
			Effect.gen(function* () {
				const user = currentRequestState.user as TUser | undefined;
				if (user === undefined) {
					return yield* Effect.fail(
						new AuthenticationError({
							message: "API key authentication required",
							code: "UNAUTHENTICATED",
						}),
					);
				}
				return user;
			}),
	} as AuthService<TUser>);

/**
 * Default API Key AuthService layer.
 */
export const AuthServiceApiKey: Layer.Layer<AuthService> = createAuthServiceApiKey();
`;

	return { content, filename: "services/auth-service-apikey.ts" };
};
