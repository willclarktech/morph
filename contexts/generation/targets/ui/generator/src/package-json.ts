/**
 * package.json generation for UI app.
 */
import type { PackageMetadata } from "@morphdsl/builder-app";

import { orderedPackageJson, toPackageScope } from "@morphdsl/builder-app";

/**
 * Generate package.json for UI app.
 */
export const generateUiPackageJson = (
	name: string,
	clientPackage: string,
	dslPackage: string,
	corePackage: string,
	metadata?: PackageMetadata,
): string => {
	const scope = toPackageScope(name, metadata?.npmScope);
	const scenariosPackage = `@${scope}/scenarios`;
	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		name: `@${scope}/ui`,
		version: "0.0.0",
		...(metadata?.description
			? { description: `${metadata.description} — UI` }
			: {}),
		...(metadata?.license ? { license: metadata.license } : {}),
		...(metadata?.author ? { author: metadata.author } : {}),
		...(metadata?.repository
			? {
					repository: {
						type: "git",
						url: metadata.repository,
						directory: "apps/ui",
					},
				}
			: {}),
		type: "module",
		scripts: {
			"build:check": "tsc --noEmit",
			dev: "bun --hot src/index.ts",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
			start: "bun src/index.ts",
			test: "bun test",
			"test:coverage":
				"bun test --coverage --coverage-reporter=lcov --coverage-dir=./coverage",
		},
		dependencies: {
			[clientPackage]: "workspace:*",
			[dslPackage]: "workspace:*",
			effect: "^3.19.13",
		},
		devDependencies: {
			"@morphdsl/scenario-runner-ui": "workspace:*",
			[corePackage]: "workspace:*",
			[`@${scope}/eslint-config`]: "workspace:*",
			[scenariosPackage]: "workspace:*",
			[`@${scope}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			playwright: "^1.57.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		private: true,
	};
	return JSON.stringify(orderedPackageJson(package_), undefined, "\t") + "\n";
};
