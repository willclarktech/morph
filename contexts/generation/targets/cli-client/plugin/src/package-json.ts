import { buildPackageJson } from "@morph/builder-app";

export const generateClientCliPackageJson = (
	name: string,
	clientPackage: string,
	corePackage: string,
	scenariosPackage: string,
	hasAuth: boolean,
): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "cli-client",
		bin: { [`${name}-client`]: "./src/index.ts" },
		dependencies: {
			"@morph/runtime-cli": "workspace:*",
			[clientPackage]: "workspace:*",
		},
		devDependencies: {
			"@morph/scenario-runner-cli-client": "workspace:*",
			[corePackage]: "workspace:*",
			[scenariosPackage]: "workspace:*",
		},
		includeEffect: true,
		includeStartScript: true,
		includeTestScript: true,
	});
