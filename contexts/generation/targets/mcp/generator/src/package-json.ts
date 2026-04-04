/**
 * MCP package.json generation.
 */
import type { PackageMetadata } from "@morphdsl/builder-app";

import { orderedPackageJson, toPackageScope } from "@morphdsl/builder-app";
import { toKebabCase } from "@morphdsl/utils";

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
	readonly metadata?: PackageMetadata;
}

/**
 * Generate package.json for an MCP app.
 */
export const generateMcpPackageJson = (
	options: McpPackageJsonOptions,
): string => {
	const { name, contexts, scenariosPackage, metadata } = options;
	const scope = toPackageScope(name, metadata?.npmScope);

	// Build dependencies from all contexts
	const contextDeps: Record<string, string> = {};

	for (const context of contexts) {
		contextDeps[context.corePackage] = "workspace:*";
	}

	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		name: `@${scope}/mcp`,
		version: "0.0.0",
		...(metadata?.description
			? { description: `${metadata.description} — MCP server` }
			: {}),
		...(metadata?.license ? { license: metadata.license } : {}),
		...(metadata?.author ? { author: metadata.author } : {}),
		...(metadata?.repository
			? {
					repository: {
						type: "git",
						url: metadata.repository,
						directory: "apps/mcp",
					},
				}
			: {}),
		type: "module",
		bin: { [`${toKebabCase(name)}-mcp`]: "./dist/cli.js" },
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
		dependencies: {
			"@morphdsl/runtime-mcp": "workspace:*",
			...contextDeps,
			effect: "^3.19.13",
		},
		devDependencies: {
			"@morphdsl/scenario-runner-mcp": "workspace:*",
			[`@${scope}/eslint-config`]: "workspace:*",
			[scenariosPackage]: "workspace:*",
			[`@${scope}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
	};
	return JSON.stringify(orderedPackageJson(package_), undefined, "\t") + "\n";
};
