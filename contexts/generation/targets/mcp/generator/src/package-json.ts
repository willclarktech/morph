/**
 * MCP package.json generation.
 */

/**
 * Recursively sort object keys alphabetically for consistent JSON output.
 */
const sortObjectKeys = <T extends Record<string, unknown>>(input: T): T => {
	if (Array.isArray(input)) {
		return input as T;
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		sorted[key] =
			typeof value === "object" && value !== null && !Array.isArray(value)
				? sortObjectKeys(value as Record<string, unknown>)
				: value;
	}
	return sorted as T;
};

/**
 * Context package information for multi-context apps.
 */
export interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

export interface McpPackageJsonOptions {
	readonly name: string;
	readonly contexts: readonly ContextPackages[];
	readonly scenariosPackage: string;
}

/**
 * Generate package.json for an MCP app.
 */
export const generateMcpPackageJson = (
	options: McpPackageJsonOptions,
): string => {
	const { name, contexts, scenariosPackage } = options;

	// Build dependencies from all contexts
	const contextDeps: Record<string, string> = {};

	for (const ctx of contexts) {
		contextDeps[ctx.corePackage] = "workspace:*";
	}

	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		dependencies: {
			"@morph/runtime-mcp": "workspace:*",
			...contextDeps,
			effect: "^3.19.13",
		},
		devDependencies: {
			"@morph/scenario-runner-mcp": "workspace:*",
			[`@${name}/eslint-config`]: "workspace:*",
			[scenariosPackage]: "workspace:*",
			[`@${name}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		name: `@${name}/mcp`,
		private: true,
		scripts: {
			"build:check": "tsc --noEmit",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			inspect: "bunx @modelcontextprotocol/inspector bun src/index.ts",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
			start: "bun src/index.ts",
			test: "bun test",
			"test:coverage":
				"bun test --coverage --coverage-reporter=lcov --coverage-dir=./coverage",
		},
		type: "module",
		version: "0.0.0",
	};
	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};
