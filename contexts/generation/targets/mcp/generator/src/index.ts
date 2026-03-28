/**
 * Morph MCP Generator
 *
 * Generate MCP (Model Context Protocol) servers from domain operations.
 * Follows the same pattern as @morph/runtime-cli and @morph/runtime-api.
 */

// Re-export runtime
export { createMcp, type McpConfig, type McpResult } from "./mcp";

// Re-export code generation
export {
	type ContextPackages,
	generate,
	type GenerateMcpAppOptions,
} from "./generate";
export {
	generateMcpPackageJson,
	type McpPackageJsonOptions,
} from "./package-json";

// Re-export schema utilities
export {
	effectSchemaToZod,
	effectSchemaToZodShape,
	getSchemaDescription,
} from "./schema";

// Re-export auth utilities
export {
	AuthServiceTag,
	createAuthInfoStrategy,
	createClientIdStrategy,
	createCompositeStrategy,
	createRequestAuthService,
	createSessionStrategy,
} from "./auth";
export type { AuthService, McpAuthStrategy, McpExtra } from "./auth";

// Re-export param injection
export { injectParameters } from "./params";
export type { InjectionContext } from "./params";
