/**
 * AuthServiceNone implementation generator.
 * Delegates to @morphdsl/auth-none-core operations.
 */

import type { GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the "None" AuthService implementation (no auth).
 * Uses @morphdsl/auth-none-core adapter.
 */
export const generateAuthServiceNone = (): GeneratedFile => {
	const content = `// Generated AuthServiceNone implementation
// Delegates to @morphdsl/auth-none-core adapter
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";

import { AuthenticationError } from "./auth-errors";
import { AuthService } from "./auth-service";

/**
 * AuthService implementation that provides no authentication.
 * getCurrentUser always returns undefined.
 * requireAuth always fails.
 *
 * Use this for operations that don't require authentication,
 * or as a default when no auth is configured.
 */
export const AuthServiceNone: Layer.Layer<AuthService> = Layer.succeed(
	AuthService,
	{
		getCurrentUser: () => Effect.succeed(undefined),
		requireAuth: () =>
			Effect.fail(
				new AuthenticationError({
					message: "No authentication configured",
					code: "UNAUTHENTICATED",
				}),
			),
	},
);
`;

	return { content, filename: "services/auth-service-none.ts" };
};
