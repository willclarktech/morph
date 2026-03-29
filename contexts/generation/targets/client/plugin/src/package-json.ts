import { buildPackageJson } from "@morphdsl/builder-app";

export const generateClientPackageJson = (
	name: string,
	dslPackages: readonly string[],
	corePackage: string,
): string => {
	const dslDependencies: Record<string, string> = {};
	for (const pkg of dslPackages) {
		dslDependencies[pkg] = "workspace:*";
	}
	return buildPackageJson({
		projectName: name,
		packageSuffix: "client",
		dependencies: {
			"@morphdsl/http-client": "workspace:*",
			...dslDependencies,
		},
		devDependencies: {
			"@morphdsl/scenario-runner-client": "workspace:*",
			[corePackage]: "workspace:*",
			[`@${name}/scenarios`]: "workspace:*",
		},
		exports: { ".": "./src/index.ts" },
		includeEffect: true,
		includeTestScript: true,
	});
};
