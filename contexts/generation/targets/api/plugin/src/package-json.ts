import type { EncodingFormat } from "@morphdsl/domain-schema";

import { buildPackageJson } from "@morphdsl/builder-app";

const codecDependencies = (
	formats: readonly EncodingFormat[],
): Record<string, string> => {
	const deps: Record<string, string> = {};
	if (formats.length > 0) {
		deps["@morphdsl/codec-impls"] = "workspace:*";
	}
	for (const format of formats) {
		switch (format) {
			case "json": {
				deps["@morphdsl/codec-json-impls"] = "workspace:*";
				break;
			}
			case "yaml": {
				deps["@morphdsl/codec-yaml-impls"] = "workspace:*";
				break;
			}
			case "protobuf": {
				deps["@morphdsl/codec-protobuf-impls"] = "workspace:*";
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
	npmScope?: string,
): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "api",
		dependencies: {
			"@morphdsl/runtime-api": "workspace:*",
			...(hasPasswordAuth ? { "@morphdsl/auth-password-impls": "workspace:*" } : {}),
			...codecDependencies(encodingFormats),
			[corePackage]: "workspace:*",
		},
		devDependencies: {
			"@morphdsl/scenario-runner-api": "workspace:*",
			[dslPackage]: "workspace:*",
			[`@${npmScope ?? name.toLowerCase()}/scenarios`]: "workspace:*",
		},
		includeEffect: true,
		includeTestScript: true,
		includeStartScript: true,
		includeDevScript: true,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
