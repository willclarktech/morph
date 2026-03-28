// Port (DI contract) definitions
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type { AuthenticationError } from "./errors";

/**
 * Authentication context provider
 */
export interface AuthService<TUser = unknown> {
	/**
	 * Get the currently authenticated user, or undefined if not authenticated
	 */
	readonly getCurrentUser: () => Effect.Effect<TUser | undefined>;

	/**
	 * Require authentication - fails if not authenticated
	 */
	readonly requireAuth: () => Effect.Effect<TUser, AuthenticationError>;
}

/**
 * Context tag for AuthService dependency injection.
 */
export const AuthService =
	Context.GenericTag<AuthService>("@morph/AuthService");
