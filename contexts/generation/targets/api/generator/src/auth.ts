/**
 * HTTP API Authentication
 *
 * Per-request authentication middleware that extracts user identity
 * from HTTP headers and creates AuthService for Effect injection.
 */
import { Context, Effect } from "effect";

// Re-export strategies and JWT types
export * from "./auth-strategies";
export type { JwtConfig, JwtPayload } from "./jwt-verification";

/**
 * Authentication error for failed auth attempts.
 */
export class AuthenticationError extends Error {
	readonly _tag = "AuthenticationError";
	readonly code: string;

	constructor(options: { code: string; message: string }) {
		super(options.message);
		this.code = options.code;
		this.name = "AuthenticationError";
	}
}

/**
 * Generic AuthService interface for dependency injection.
 * Matches the generated AuthService pattern.
 */
export interface AuthService<TUser = unknown> {
	readonly getCurrentUser: () => Effect.Effect<TUser | undefined>;
	readonly requireAuth: () => Effect.Effect<TUser, AuthenticationError>;
}

/**
 * Context tag for AuthService dependency injection.
 * Used for per-request auth service injection.
 */
export const AuthServiceTag =
	Context.GenericTag<AuthService>("@app/AuthService");

/**
 * Create an AuthService instance for a specific request.
 *
 * This is injected per-request to provide the authenticated user
 * (or undefined for unauthenticated requests).
 *
 * @param user The authenticated user, or undefined if not authenticated
 */
export const createRequestAuthService = <TUser>(
	user: TUser | undefined,
): AuthService<TUser> => ({
	getCurrentUser: () => Effect.succeed(user),
	requireAuth: () =>
		user === undefined
			? Effect.fail(
					new AuthenticationError({
						code: "UNAUTHENTICATED",
						message: "Not authenticated",
					}),
				)
			: Effect.succeed(user),
});
