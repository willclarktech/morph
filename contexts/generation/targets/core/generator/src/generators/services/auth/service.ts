/**
 * AuthService interface generator.
 * Re-exports from @morph/auth-dsl instead of defining inline.
 */

import type { GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the AuthService interface.
 * Re-exports the canonical AuthService from @morph/auth-dsl.
 */
export const generateAuthService = (
	_typesImportPath = "../schemas",
	_projectName = "app",
): GeneratedFile => {
	const content = `// Generated AuthService interface - re-exported from @morph/auth-dsl
// Do not edit - regenerate from schema

export { AuthService } from "@morph/auth-dsl";
export type { AuthService as AuthServiceInterface } from "@morph/auth-dsl";
`;

	return { content, filename: "services/auth-service.ts" };
};
