import { sortObjectKeys } from "@morph/utils";

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

/** Configuration for building a package.json */
export interface PackageJsonConfig {
	/** Project name (e.g., "todo-app") */
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
}

/** Convert project name to lowercase for package scope */
const toPackageScope = (name: string): string => name.toLowerCase();

/** Get standard dev dependencies for a package */
const getStandardDevDeps = (
	projectName: string,
): Record<string, string> => {
	const scope = toPackageScope(projectName);
	return {
		[`@${scope}/eslint-config`]: "workspace:*",
		[`@${scope}/tsconfig`]: "workspace:*",
		eslint: TOOL_VERSIONS.eslint,
		prettier: TOOL_VERSIONS.prettier,
		typescript: TOOL_VERSIONS.typescript,
	};
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
		...getStandardDevDeps(projectName),
		...devDependencies,
	};
	if (includeFastCheck === "devDependencies") {
		finalDevDeps["fast-check"] = TOOL_VERSIONS.fastCheck;
	}

	// Build scripts
	const finalScripts: Record<string, string> = { ...BASE_SCRIPTS, ...scripts };
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
	const scope = toPackageScope(projectName);
	const package_: Record<string, unknown> = {
		$schema: "https://json.schemastore.org/package.json",
		...(bin ? { bin } : {}),
		...(Object.keys(finalDeps).length > 0 ? { dependencies: finalDeps } : {}),
		devDependencies: finalDevDeps,
		...(packageExports ? { exports: packageExports } : {}),
		name: `@${scope}/${packageSuffix}`,
		private: true,
		scripts: finalScripts,
		type: "module",
		version: "0.0.0",
	};

	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};

/** Re-export tool versions for use in specific generators */
export { TOOL_VERSIONS };
