/**
 * Authentication strategies for extracting user identity from HTTP requests.
 */
import type { JwtConfig } from "./jwt-verification";

import { verifyJwt } from "./jwt-verification";

const BEARER_PREFIX = "Bearer ";

/**
 * Strategy for extracting user identity from HTTP requests.
 */
export interface AuthStrategy<TUser = unknown> {
	readonly extractUser: (request: Request) => Promise<TUser | undefined>;
}

/**
 * Simple bearer strategy: Authorization: Bearer <userId>
 *
 * Extracts user ID directly from token value (no verification).
 * Use only for development and testing.
 *
 * @param fetchUser Function to look up user by ID
 */
export const createSimpleBearerStrategy = <TUser>(
	fetchUser: (userId: string) => Promise<TUser | undefined>,
): AuthStrategy<TUser> => ({
	extractUser: async (request) => {
		const token = extractBearerToken(request);
		if (!token) return undefined;
		return fetchUser(token);
	},
});

/**
 * JWT bearer strategy: Authorization: Bearer <jwt>
 *
 * Verifies JWT signature and extracts user ID from `sub` claim.
 *
 * @param config JWT verification configuration
 * @param fetchUser Function to look up user by ID from token subject
 */
export const createJwtStrategy = <TUser>(
	config: JwtConfig,
	fetchUser: (userId: string) => Promise<TUser | undefined>,
): AuthStrategy<TUser> => ({
	extractUser: async (request) => {
		const token = extractBearerToken(request);
		if (!token) return undefined;

		const payload = await verifyJwt(token, config);
		if (!payload?.sub) return undefined;

		return fetchUser(payload.sub);
	},
});

/**
 * API key strategy: X-API-Key header
 *
 * Looks up API key in a key store to get associated user/service account.
 *
 * @param lookupKey Function to look up user by API key
 */
export const createApiKeyStrategy = <TUser>(
	lookupKey: (apiKey: string) => Promise<TUser | undefined>,
): AuthStrategy<TUser> => ({
	extractUser: async (request) => {
		const apiKey = request.headers.get("X-API-Key");
		if (!apiKey) return undefined;
		return lookupKey(apiKey);
	},
});

/**
 * Composite strategy that tries multiple strategies in order.
 *
 * @param strategies Strategies to try, in order of priority
 */
export const createCompositeStrategy = <TUser>(
	strategies: readonly AuthStrategy<TUser>[],
): AuthStrategy<TUser> => ({
	extractUser: async (request) => {
		for (const strategy of strategies) {
			const user = await strategy.extractUser(request);
			if (user !== undefined) return user;
		}
		return undefined;
	},
});

/**
 * Extract bearer token from Authorization header.
 */
const extractBearerToken = (request: Request): string | undefined => {
	const auth = request.headers.get("Authorization");
	if (!auth?.startsWith(BEARER_PREFIX)) return undefined;
	return auth.slice(BEARER_PREFIX.length);
};
