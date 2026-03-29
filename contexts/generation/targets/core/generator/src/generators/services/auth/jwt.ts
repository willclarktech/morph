/**
 * AuthServiceJwt implementation generator.
 * Delegates to @morphdsl/auth-jwt-impls for JWT operations.
 */

import type { GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the JWT AuthService implementation.
 * Uses @morphdsl/auth-jwt-impls for JWT operations.
 */
export const generateAuthServiceJwt = (envPrefix: string): GeneratedFile => {
	const content = `// Generated AuthServiceJwt implementation
// Delegates to @morphdsl/auth-jwt-impls for JWT operations
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";
import { signToken, verifyToken } from "@morphdsl/auth-jwt-impls";

import { AuthenticationError } from "./auth-errors";
import type { AuthService } from "./auth-service";
import { AuthService as AuthServiceTag } from "./auth-service";

/**
 * Configuration for JWT authentication.
 */
export interface JwtConfig {
	/** Secret key for HS256 or public key for RS256 */
	readonly secret: string;
}

/**
 * Internal state for JWT authentication.
 * Holds the decoded user from the current request.
 */
interface JwtAuthState {
	readonly user: unknown;
}

let currentRequestState: JwtAuthState = { user: undefined };

/**
 * Set the current request's authenticated user.
 * Called by middleware/handlers before processing.
 */
export const setJwtUser = (user: unknown): void => {
	currentRequestState = { user };
};

/**
 * Verify a JWT token using the auth-jwt adapter.
 * Returns an Effect that resolves to the JWT payload.
 */
export const verifyJwt = (token: string, secret: string) =>
	verifyToken(token, secret);

/**
 * Sign a JWT token using the auth-jwt adapter.
 * Returns an Effect that resolves to the signed token string.
 */
export const signJwt = (
	payload: { readonly sub: string; readonly iat: number; readonly exp?: number },
	secret: string,
) =>
	signToken(payload, secret);

/**
 * Create an AuthService layer using JWT authentication.
 *
 * @param config JWT configuration including secret
 */
export const createAuthServiceJwt = <TUser>(
	_config: JwtConfig,
): Layer.Layer<AuthService<TUser>> =>
	Layer.succeed(AuthServiceTag, {
		getCurrentUser: () => Effect.sync(() => currentRequestState.user as TUser | undefined),
		requireAuth: () =>
			Effect.gen(function* () {
				const user = currentRequestState.user as TUser | undefined;
				if (user === undefined) {
					return yield* Effect.fail(
						new AuthenticationError({
							message: "JWT authentication required",
							code: "UNAUTHENTICATED",
						}),
					);
				}
				return user;
			}),
	} as AuthService<TUser>);

/**
 * Default JWT AuthService layer.
 * Requires ${envPrefix}_JWT_SECRET environment variable.
 */
export const AuthServiceJwt: Layer.Layer<AuthService> = createAuthServiceJwt({
	secret: process.env["${envPrefix}_JWT_SECRET"] ?? "",
});
`;

	return { content, filename: "services/auth-service-jwt.ts" };
};
