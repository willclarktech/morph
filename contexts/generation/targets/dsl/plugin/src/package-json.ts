import type { ContextPackageInfo } from "./info";
import { toPackageScope } from "./info";
import { buildPackageJson } from "@morphdsl/builder-app";
import { sortObjectKeys } from "@morphdsl/utils";

export const generateContextDslPackageJson = (
	projectName: string,
	info: ContextPackageInfo,
	dependencyPackages: readonly string[],
	isPrimary: boolean,
	npmScope?: string,
): string => {
	const scope = toPackageScope(projectName, npmScope);
	const dependencies: Record<string, string> = {
		...(isPrimary ? { "@morphdsl/domain-schema": "workspace:*" } : {}),
		effect: "^3.19.13",
	};

	if (info.hasOperations) {
		dependencies["@morphdsl/operation"] = "workspace:*";
	}

	for (const depPackage of dependencyPackages) {
		dependencies[depPackage] = "workspace:*";
	}

	if (info.hasArbitraries) {
		dependencies["fast-check"] = "^3.23.1";
	}

	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		dependencies,
		devDependencies: {
			[`@${scope}/eslint-config`]: "workspace:*",
			[`@${scope}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		exports: {
			".": "./src/index.ts",
		},
		name: info.packageName,
		private: true,
		scripts: {
			"build:check": "tsc --noEmit",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
		},
		type: "module",
		version: "0.0.0",
	};
	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};

export const generateScenariosPackageJson = (
	name: string,
	dslPackages: readonly string[],
	npmScope?: string,
): string => {
	const dependencies: Record<string, string> = {
		"@morphdsl/scenario": "workspace:*",
	};
	for (const pkg of dslPackages) {
		dependencies[pkg] = "workspace:*";
	}

	return buildPackageJson({
		projectName: name,
		packageSuffix: "scenarios",
		dependencies,
		exports: { ".": "./src/index.ts" },
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};

export const generatePropertiesPackageJson = (
	name: string,
	dslPackages: readonly string[],
	npmScope?: string,
): string => {
	const dependencies: Record<string, string> = {
		"@morphdsl/property": "workspace:*",
	};
	for (const pkg of dslPackages) {
		dependencies[pkg] = "workspace:*";
	}

	return buildPackageJson({
		projectName: name,
		packageSuffix: "properties",
		dependencies,
		exports: { ".": "./src/index.ts" },
		includeFastCheck: "dependencies",
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};
