/**
 * MCP Authentication
 *
 * Per-request authentication for MCP servers that extracts user identity
 * from MCP RequestHandlerExtra and creates AuthService for Effect injection.
 */
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
	ServerNotification,
	ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

import { Context, Effect } from "effect";

// ============================================================================
// Types
// ============================================================================

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
 */
export interface AuthService<TUser = unknown> {
	readonly getCurrentUser: () => Effect.Effect<TUser | undefined>;
	readonly requireAuth: () => Effect.Effect<TUser, AuthenticationError>;
}

/**
 * Context tag for AuthService dependency injection.
 */
export const AuthServiceTag =
	Context.GenericTag<AuthService>("@app/AuthService");

/**
 * MCP request handler extra type alias.
 */
export type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * Strategy for extracting user identity from MCP requests.
 */
export interface McpAuthStrategy<TUser = unknown> {
	readonly extractUser: (extra: McpExtra) => TUser | undefined;
}

// ============================================================================
// Auth Strategies
// ============================================================================

/**
 * Auth info strategy: Extract user from authInfo.extra.
 *
 * MCP clients can set user data in authInfo.extra when establishing
 * the connection. This strategy extracts that user data.
 *
 * @param getUserFromExtra Function to extract user from authInfo.extra
 */
export const createAuthInfoStrategy = <TUser>(
	getUserFromExtra: (extra: Record<string, unknown>) => TUser | undefined = (
		extra,
	) => extra["user"] as TUser | undefined,
): McpAuthStrategy<TUser> => ({
	extractUser: (requestExtra) => {
		const authExtra = requestExtra.authInfo?.extra;
		if (!authExtra) return undefined;
		return getUserFromExtra(authExtra);
	},
});

/**
 * Session strategy: Look up user by session ID.
 *
 * For MCP servers that pre-authenticate users and store them by session,
 * this strategy looks up the user from a session store.
 *
 * @param sessionStore Map of session ID to user
 */
export const createSessionStrategy = <TUser>(
	sessionStore: ReadonlyMap<string, TUser>,
): McpAuthStrategy<TUser> => ({
	extractUser: (extra) => {
		if (!extra.sessionId) return undefined;
		return sessionStore.get(extra.sessionId);
	},
});

/**
 * Simple user ID strategy: Extract user ID directly from authInfo.clientId.
 *
 * Treats the clientId as the user ID. Useful for simple setups where
 * the client ID represents the authenticated user.
 *
 * @param fetchUser Function to look up user by ID
 */
export const createClientIdStrategy = <TUser>(
	fetchUser: (userId: string) => TUser | undefined,
): McpAuthStrategy<TUser> => ({
	extractUser: (extra) => {
		const clientId = extra.authInfo?.clientId;
		if (!clientId) return undefined;
		return fetchUser(clientId);
	},
});

/**
 * Composite strategy that tries multiple strategies in order.
 *
 * @param strategies Strategies to try, in order of priority
 */
export const createCompositeStrategy = <TUser>(
	strategies: readonly McpAuthStrategy<TUser>[],
): McpAuthStrategy<TUser> => ({
	extractUser: (extra) => {
		for (const strategy of strategies) {
			const user = strategy.extractUser(extra);
			if (user !== undefined) return user;
		}
		return undefined;
	},
});

// ============================================================================
// Per-Request AuthService
// ============================================================================

/**
 * Create an AuthService instance for a specific request.
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
