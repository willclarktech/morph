/**
 * API package.json generation.
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
 * Generate package.json for an API app.
 */
export const generateApiPackageJson = (
	name: string,
	corePackage: string,
	_hasEvents: boolean,
	hasPasswordAuth = false,
): string => {
	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		dependencies: {
			"@morphdsl/runtime-api": "workspace:*",
			...(hasPasswordAuth ? { "@morphdsl/auth-password": "workspace:*" } : {}),
			[corePackage]: "workspace:*",
			effect: "^3.19.13",
		},
		devDependencies: {
			[`@${name}/eslint-config`]: "workspace:*",
			[`@${name}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		name: `@${name}/api`,
		private: true,
		scripts: {
			"build:check": "tsc --noEmit",
			dev: "bun --hot src/index.ts",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
			start: "bun src/index.ts",
		},
		type: "module",
		version: "0.0.0",
	};
	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};
