import { sortObjectKeys, toKebabCase } from "@morphdsl/utils";

/** Common tool versions used across all packages */
const TOOL_VERSIONS = {
	effect: "^3.19.13",
	eslint: "^9.39.0",
	fastCheck: "^3.23.1",
	jose: "^6.0.11",
	prettier: "^3.4.2",
	typescript: "^5.7.2",
} as const;

/** Base scripts included in all packages */
const BASE_SCRIPTS = {
	"build:check": "tsc --noEmit",
	format: "prettier --check .",
	"format:fix": "prettier --write .",
	lint: "eslint .",
	"lint:fix": "eslint . --fix",
} as const;

/** Package metadata from the domain schema */
export interface PackageMetadata {
	description?: string;
	license?: string;
	repository?: string;
	author?: string;
	npmScope?: string;
}

/** Configuration for building a package.json */
export interface PackageJsonConfig {
	/** Project name (e.g., "todo") */
	projectName: string;
	/** Package suffix (e.g., "core", "api", "cli") */
	packageSuffix: string;
	/** Runtime dependencies (keys are package names, values are versions or "workspace:*") */
	dependencies?: Record<string, string>;
	/** Dev dependencies (keys are package names, values are versions or "workspace:*") */
	devDependencies?: Record<string, string>;
	/** Additional scripts beyond the base set */
	scripts?: Record<string, string>;
	/** Package exports (e.g., { ".": "./src/index.ts" }) */
	exports?: Record<string, string>;
	/** Binary entry points (for CLI packages) */
	bin?: Record<string, string>;
	/** Include effect in dependencies */
	includeEffect?: boolean;
	/** Include fast-check in dependencies or devDependencies */
	includeFastCheck?: "dependencies" | "devDependencies" | undefined;
	/** Include jose in dependencies */
	includeJose?: boolean;
	/** Include test script */
	includeTestScript?: boolean;
	/** Include start script */
	includeStartScript?: boolean;
	/** Include dev script (bun --hot) */
	includeDevScript?: boolean;
	/** Whether this package should be private (default: true) */
	isPrivate?: boolean;
	/** Package metadata from the domain schema */
	metadata?: PackageMetadata;
}

/** Convert project name to npm package scope */
export const toPackageScope = (name: string, npmScope?: string): string =>
	npmScope ?? toKebabCase(name);

/** Get standard dev dependencies for a package */
const getStandardDevDeps = (
	projectName: string,
	npmScope?: string,
): Record<string, string> => {
	const scope = toPackageScope(projectName, npmScope);
	return {
		[`@${scope}/eslint-config`]: "workspace:*",
		[`@${scope}/tsconfig`]: "workspace:*",
		eslint: TOOL_VERSIONS.eslint,
		prettier: TOOL_VERSIONS.prettier,
		typescript: TOOL_VERSIONS.typescript,
	};
};

const BUILD_SCRIPT =
	"bun build ./src/index.ts --outdir dist --target node --format esm --packages external && tsc -p tsconfig.build.json";

/** Human-friendly key ordering for package.json */
const PACKAGE_KEY_ORDER = [
	"$schema",
	"name",
	"version",
	"private",
	"description",
	"license",
	"author",
	"repository",
	"type",
	"main",
	"exports",
	"files",
	"bin",
	"publishConfig",
	"scripts",
	"dependencies",
	"devDependencies",
];

/** Order package.json keys in a human-friendly order, with sub-objects sorted alphabetically */
export const orderedPackageJson = (
	obj: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const key of PACKAGE_KEY_ORDER) {
		if (key in obj) {
			const value = obj[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	for (const key of Object.keys(obj).sort()) {
		if (!(key in result)) {
			const value = obj[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	return result;
};

/** Build a complete package.json string */
export const buildPackageJson = (config: PackageJsonConfig): string => {
	const {
		projectName,
		packageSuffix,
		dependencies = {},
		devDependencies = {},
		scripts = {},
		exports: packageExports,
		bin,
		includeEffect = false,
		includeFastCheck,
		includeJose = false,
		includeTestScript = false,
		includeStartScript = false,
		includeDevScript = false,
		isPrivate = true,
		metadata,
	} = config;

	// Build dependencies
	const finalDeps: Record<string, string> = { ...dependencies };
	if (includeEffect) {
		finalDeps["effect"] = TOOL_VERSIONS.effect;
	}
	if (includeFastCheck === "dependencies") {
		finalDeps["fast-check"] = TOOL_VERSIONS.fastCheck;
	}
	if (includeJose) {
		finalDeps["jose"] = TOOL_VERSIONS.jose;
	}

	// Build devDependencies
	const finalDevDeps: Record<string, string> = {
		...getStandardDevDeps(projectName, metadata?.npmScope),
		...devDependencies,
	};
	if (includeFastCheck === "devDependencies") {
		finalDevDeps["fast-check"] = TOOL_VERSIONS.fastCheck;
	}

	// Build scripts
	const finalScripts: Record<string, string> = { ...BASE_SCRIPTS, ...scripts };
	if (!isPrivate) {
		finalScripts["build"] = BUILD_SCRIPT;
	}
	if (includeTestScript) {
		finalScripts["test"] = "bun test";
		finalScripts["test:coverage"] =
			"bun test --coverage --coverage-reporter=lcov --coverage-dir=./coverage";
	}
	if (includeStartScript) {
		finalScripts["start"] = "bun src/index.ts";
	}
	if (includeDevScript) {
		finalScripts["dev"] = "bun --hot src/index.ts";
	}

	// Build package object
	const scope = toPackageScope(projectName, metadata?.npmScope);
	const package_: Record<string, unknown> = {
		$schema: "https://json.schemastore.org/package.json",
		name: `@${scope}/${packageSuffix}`,
		version: "0.0.0",
		...(metadata?.description ? { description: metadata.description } : {}),
		...(metadata?.license ? { license: metadata.license } : {}),
		...(metadata?.author ? { author: metadata.author } : {}),
		...(metadata?.repository
			? {
					repository: {
						type: "git",
						url: metadata.repository.startsWith("git+")
							? metadata.repository
							: `git+${metadata.repository}.git`,
						directory: `packages/${packageSuffix}`,
					},
				}
			: {}),
		type: "module",
		...(packageExports ? { exports: packageExports } : {}),
		...(!isPrivate ? { files: ["dist"] } : {}),
		...(bin ? { bin } : {}),
		...(!isPrivate
			? {
					publishConfig: {
						exports: {
							".": {
								types: "./dist/index.d.ts",
								import: "./dist/index.js",
							},
						},
					},
				}
			: {}),
		scripts: finalScripts,
		...(Object.keys(finalDeps).length > 0 ? { dependencies: finalDeps } : {}),
		devDependencies: finalDevDeps,
		...(isPrivate ? { private: true } : {}),
	};

	return JSON.stringify(orderedPackageJson(package_), undefined, "\t") + "\n";
};

/** Re-export tool versions for use in specific generators */
export { TOOL_VERSIONS };
