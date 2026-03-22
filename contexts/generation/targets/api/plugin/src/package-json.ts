import type { EncodingFormat } from "@morph/domain-schema";

import { buildPackageJson } from "@morph/builder-app";

const codecDependencies = (
	formats: readonly EncodingFormat[],
): Record<string, string> => {
	const deps: Record<string, string> = {};
	if (formats.length > 0) {
		deps["@morph/codec-impls"] = "workspace:*";
	}
	for (const format of formats) {
		switch (format) {
			case "json": {
				deps["@morph/codec-json-impls"] = "workspace:*";
				break;
			}
			case "yaml": {
				deps["@morph/codec-yaml-impls"] = "workspace:*";
				break;
			}
			case "protobuf": {
				deps["@morph/codec-protobuf-impls"] = "workspace:*";
				break;
			}
		}
	}
	return deps;
};

export const generateApiPackageJson = (
	name: string,
	corePackage: string,
	dslPackage: string,
	hasPasswordAuth: boolean,
	encodingFormats: readonly EncodingFormat[] = [],
): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "api",
		dependencies: {
			"@morph/runtime-api": "workspace:*",
			...(hasPasswordAuth ? { "@morph/auth-password-impls": "workspace:*" } : {}),
			...codecDependencies(encodingFormats),
			[corePackage]: "workspace:*",
		},
		devDependencies: {
			"@morph/scenario-runner-api": "workspace:*",
			[dslPackage]: "workspace:*",
			[`@${name.toLowerCase()}/scenarios`]: "workspace:*",
		},
		includeEffect: true,
		includeTestScript: true,
		includeStartScript: true,
		includeDevScript: true,
	});
