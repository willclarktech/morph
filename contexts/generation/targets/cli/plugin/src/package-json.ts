import type { EncodingFormat } from "@morph/domain-schema";

import { buildPackageJson } from "@morph/builder-app";

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
	} = options;

	// Codec dependencies based on encoding formats
	const codecDeps: Record<string, string> = {};
	if (encodingFormats.length > 0) {
		codecDeps["@morph/codec-impls"] = "workspace:*";
		for (const format of encodingFormats) {
			switch (format) {
				case "json": {
					codecDeps["@morph/codec-json-impls"] = "workspace:*";
					break;
				}
				case "yaml": {
					codecDeps["@morph/codec-yaml-impls"] = "workspace:*";
					break;
				}
				case "protobuf": {
					codecDeps["@morph/codec-protobuf-impls"] = "workspace:*";
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
		bin: { [projectName]: "./src/index.ts" },
		dependencies: {
			...(hasAuth
				? {
						"@morph/auth-password-impls": "workspace:*",
						...(primaryDslPackage ? { [primaryDslPackage]: "workspace:*" } : {}),
					}
				: {}),
			...codecDeps,
			"@morph/runtime-cli": "workspace:*",
			...contextDeps,
			...dslDeps,
		},
		devDependencies: {
			"@morph/scenario-runner-cli": "workspace:*",
			...(hasPropertyTests
				? {
						"@morph/property-runner-cli": "workspace:*",
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
	});
};
