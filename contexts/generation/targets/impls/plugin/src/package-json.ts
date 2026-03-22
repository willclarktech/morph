import type { ContextImplsInfo } from "./info";
import { buildPackageJson } from "@morph/builder-app";

export const generateImplsPackageJson = (
	projectName: string,
	info: ContextImplsInfo,
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
	});
};
