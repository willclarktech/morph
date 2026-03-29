/**
 * Auth error types generator.
 * Re-exports from @morphdsl/auth-dsl instead of defining inline.
 */

import type { GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate auth-related error types.
 * Delegates to @morphdsl/auth-dsl which defines the canonical error types.
 */
export const generateAuthErrors = (): GeneratedFile => {
	const content = `// Generated auth errors - re-exported from @morphdsl/auth-dsl
// Do not edit - regenerate from schema

export { AuthenticationError, AuthorizationError } from "@morphdsl/auth-dsl";
export type { AuthError } from "@morphdsl/auth-dsl";
`;

	return { content, filename: "services/auth-errors.ts" };
};
