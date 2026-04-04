import type { EncodingFormat } from "@morphdsl/domain-schema";

import { buildPackageJson } from "@morphdsl/builder-app";
import { toKebabCase } from "@morphdsl/utils";

interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

export interface CliPackageJsonOptions {
	readonly projectName: string;
	readonly contexts: readonly ContextPackages[];
	readonly encodingFormats?: readonly EncodingFormat[];
	readonly scenariosPackage: string;
	readonly propertiesPackage: string;
	readonly hasAuth: boolean;
	readonly hasEntities: boolean;
	readonly hasPropertyTests: boolean;
	readonly npmScope?: string;
}

export const generateCliPackageJson = (options: CliPackageJsonOptions): string => {
	const {
		projectName,
		contexts,
		encodingFormats = [],
		scenariosPackage,
		propertiesPackage,
		hasAuth,
		hasEntities,
		hasPropertyTests,
		npmScope,
	} = options;

	// Codec dependencies based on encoding formats
	const codecDeps: Record<string, string> = {};
	if (encodingFormats.length > 0) {
		codecDeps["@morphdsl/codec-impls"] = "workspace:*";
		for (const format of encodingFormats) {
			switch (format) {
				case "json": {
					codecDeps["@morphdsl/codec-json-impls"] = "workspace:*";
					break;
				}
				case "yaml": {
					codecDeps["@morphdsl/codec-yaml-impls"] = "workspace:*";
					break;
				}
				case "protobuf": {
					codecDeps["@morphdsl/codec-protobuf-impls"] = "workspace:*";
					break;
				}
			}
		}
	}

	const contextDeps: Record<string, string> = {};
	const dslDeps: Record<string, string> = {};

	for (const ctx of contexts) {
		contextDeps[ctx.corePackage] = "workspace:*";
		if (hasEntities) {
			dslDeps[ctx.dslPackage] = "workspace:*";
		}
	}

	const primaryDslPackage = contexts[0]?.dslPackage;

	return buildPackageJson({
		projectName,
		packageSuffix: "cli",
		bin: { [toKebabCase(projectName)]: "./dist/cli.js" },
		dependencies: {
			...(hasAuth
				? {
						"@morphdsl/auth-password-impls": "workspace:*",
						...(primaryDslPackage ? { [primaryDslPackage]: "workspace:*" } : {}),
					}
				: {}),
			...codecDeps,
			"@morphdsl/runtime-cli": "workspace:*",
			...contextDeps,
			...dslDeps,
		},
		devDependencies: {
			"@morphdsl/scenario-runner-cli": "workspace:*",
			...(hasPropertyTests
				? {
						"@morphdsl/property-runner-cli": "workspace:*",
						[propertiesPackage]: "workspace:*",
					}
				: {}),
			[scenariosPackage]: "workspace:*",
		},
		includeEffect: true,
		includeFastCheck: hasEntities
			? "dependencies"
			: hasPropertyTests
				? "devDependencies"
				: undefined,
		includeTestScript: true,
		includeStartScript: true,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};
