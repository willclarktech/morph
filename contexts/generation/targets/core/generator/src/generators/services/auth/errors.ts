/**
 * Auth error types generator.
 * Re-exports from @morph/auth-dsl instead of defining inline.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate auth-related error types.
 * Delegates to @morph/auth-dsl which defines the canonical error types.
 */
export const generateAuthErrors = (): GeneratedFile => {
	const content = `// Generated auth errors - re-exported from @morph/auth-dsl
// Do not edit - regenerate from schema

export { AuthenticationError, AuthorizationError } from "@morph/auth-dsl";
export type { AuthError } from "@morph/auth-dsl";
`;

	return { content, filename: "services/auth-errors.ts" };
};
