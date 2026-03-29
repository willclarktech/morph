import { buildPackageJson } from "@morphdsl/builder-app";

export const generateClientCliPackageJson = (
	name: string,
	clientPackage: string,
	corePackage: string,
	scenariosPackage: string,
	hasAuth: boolean,
	npmScope?: string,
): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "cli-client",
		bin: { [`${name}-client`]: "./src/index.ts" },
		dependencies: {
			"@morphdsl/runtime-cli": "workspace:*",
			[clientPackage]: "workspace:*",
		},
		devDependencies: {
			"@morphdsl/scenario-runner-cli-client": "workspace:*",
			[corePackage]: "workspace:*",
			[scenariosPackage]: "workspace:*",
		},
		includeEffect: true,
		includeStartScript: true,
		includeTestScript: true,
		...(npmScope ? { metadata: { npmScope } } : {}),
	});
