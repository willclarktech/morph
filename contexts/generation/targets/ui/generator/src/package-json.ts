/**
 * package.json generation for UI app.
 */
import { sortObjectKeys } from "@morphdsl/utils";

/**
 * Generate package.json for UI app.
 */
export const generateUiPackageJson = (
	name: string,
	clientPackage: string,
	dslPackage: string,
	corePackage: string,
): string => {
	const scenariosPackage = `@${name}/scenarios`;
	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		dependencies: {
			[clientPackage]: "workspace:*",
			[dslPackage]: "workspace:*",
			effect: "^3.19.13",
		},
		devDependencies: {
			"@morphdsl/scenario-runner-ui": "workspace:*",
			[corePackage]: "workspace:*",
			[`@${name}/eslint-config`]: "workspace:*",
			[scenariosPackage]: "workspace:*",
			[`@${name}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			playwright: "^1.57.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		name: `@${name}/ui`,
		private: true,
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
		type: "module",
		version: "0.0.0",
	};
	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};
