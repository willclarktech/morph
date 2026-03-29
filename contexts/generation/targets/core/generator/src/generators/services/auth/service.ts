/**
 * AuthService interface generator.
 * Re-exports from @morphdsl/auth-dsl instead of defining inline.
 */

import type { GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the AuthService interface.
 * Re-exports the canonical AuthService from @morphdsl/auth-dsl.
 */
export const generateAuthService = (
	_typesImportPath = "../schemas",
	_projectName = "app",
): GeneratedFile => {
	const content = `// Generated AuthService interface - re-exported from @morphdsl/auth-dsl
// Do not edit - regenerate from schema

export { AuthService } from "@morphdsl/auth-dsl";
export type { AuthService as AuthServiceInterface } from "@morphdsl/auth-dsl";
`;

	return { content, filename: "services/auth-service.ts" };
};
