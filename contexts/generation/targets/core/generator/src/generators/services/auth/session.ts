/**
 * AuthServiceSession implementation generator.
 * Delegates to @morph/auth-session-impls for session operations.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the Session AuthService implementation.
 * Uses @morph/auth-session-impls for session operations.
 */
export const generateAuthServiceSession = (
	_envPrefix: string,
): GeneratedFile => {
	const content = `// Generated AuthServiceSession implementation
// Delegates to @morph/auth-session-impls for session operations
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";
import {
	createSession as createSessionImpl,
	destroySession as destroySessionImpl,
	validateSession as validateSessionImpl,
} from "@morph/auth-session-impls";

import { AuthenticationError } from "./auth-errors";
import type { AuthService } from "./auth-service";
import { AuthService as AuthServiceTag } from "./auth-service";

/**
 * Internal state for session authentication.
 * Holds the user from the current request's session.
 */
interface SessionAuthState {
	readonly user: unknown;
}

let currentRequestState: SessionAuthState = { user: undefined };

/**
 * Set the current request's authenticated user from session.
 * Called by middleware/handlers before processing.
 */
export const setSessionUser = (user: unknown): void => {
	currentRequestState = { user };
};

/**
 * Extract session ID from cookie header.
 */
export const extractSessionId = (
	cookieHeader: string | undefined,
	cookieName = "session",
): string | undefined => {
	if (!cookieHeader) return undefined;
	const match = cookieHeader.match(new RegExp(\`\${cookieName}=([^;]+)\`));
	return match?.[1];
};

/**
 * Validate a session using the auth-session adapter.
 * Returns the session data.
 */
export const validateSession = (sessionId: string) =>
	validateSessionImpl(sessionId);

/**
 * Create a new session using the auth-session adapter.
 * Returns the created session.
 */
export const createSessionEffect = (userId: string) =>
	createSessionImpl(userId);

/**
 * Destroy a session using the auth-session adapter.
 */
export const destroySessionEffect = (sessionId: string) =>
	destroySessionImpl(sessionId);

/**
 * Create an AuthService layer using session-based authentication.
 */
export const createAuthServiceSession = <TUser>(): Layer.Layer<AuthService<TUser>> =>
	Layer.succeed(AuthServiceTag, {
		getCurrentUser: () => Effect.sync(() => currentRequestState.user as TUser | undefined),
		requireAuth: () =>
			Effect.gen(function* () {
				const user = currentRequestState.user as TUser | undefined;
				if (user === undefined) {
					return yield* Effect.fail(
						new AuthenticationError({
							message: "Session authentication required",
							code: "UNAUTHENTICATED",
						}),
					);
				}
				return user;
			}),
	} as AuthService<TUser>);

/**
 * Default Session AuthService layer.
 */
export const AuthServiceSession: Layer.Layer<AuthService> = createAuthServiceSession();
`;

	return { content, filename: "services/auth-service-session.ts" };
};
