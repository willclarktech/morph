import type { ContextImplsInfo } from "./info";
import { buildPackageJson } from "@morphdsl/builder-app";

export const generateImplsPackageJson = (
	projectName: string,
	info: ContextImplsInfo,
	npmScope?: string,
): string => {
	return buildPackageJson({
		projectName,
		packageSuffix: `${info.kebabName}-impls`,
		dependencies: {
			[info.corePackage]: "workspace:*",
			[info.dslPackage]: "workspace:*",
		},
		exports: { ".": "./src/index.ts" },
		includeEffect: true,
		publishable: true,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
};
