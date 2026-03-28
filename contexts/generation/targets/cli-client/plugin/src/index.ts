import type { GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import { contextNameToKebab } from "@morph/domain-schema";
import { buildCliConfigFiles } from "@morph/builder-app";
import { generate as generateClientCli } from "@morph/runtime-cli-client";

import { generateClientCliDockerfile } from "./dockerfile";
import { generateClientCliPackageJson } from "./package-json";
import { generateClientCliScenarioTest } from "./tests";

export * from "./dockerfile";
export * from "./package-json";
export * from "./tests";

export const cliClientPlugin: GeneratorPlugin = {
	id: "app-cli-client",
	kind: "app",
	tags: ["@cli-client"],
	dependencies: ["lib-client"],
	metadata: {
		quickStartSteps: [
			{
				description: "Configure the API URL:",
				command:
					"bun run --filter @{name}/cli-client start -- config --api-url http://localhost:3000",
			},
			{
				description: "Run a command:",
				command: "bun run --filter @{name}/cli-client start -- --help",
			},
		],
		projectStructure: {
			path: "apps/cli-client/",
			description: "Remote CLI client",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = `apps/cli-client`;
		const scope = name.toLowerCase();

		const primaryContext = ctx.features.primaryContext ?? "app";
		const contextKebab = contextNameToKebab(primaryContext);

		const clientPackage = `@${scope}/client`;
		const dslPackage = `@${scope}/${contextKebab}-dsl`;
		const corePackage = `@${scope}/${contextKebab}-core`;
		const scenariosPackage = `@${scope}/scenarios`;
		const cliName = `${name}-client`;
		const hasAuth = ctx.features.hasAuth;
		const files: GeneratedFile[] = [];

		files.push({
			content: generateClientCliPackageJson(
				name,
				clientPackage,
				corePackage,
				scenariosPackage,
				hasAuth,
			),
			filename: `${packagePath}/package.json`,
		});

		files.push(...buildCliConfigFiles(packagePath, name));

		const cliCode = generateClientCli({
			clientPackage,
			cliName,
			dslPackage,
			packageDir: packagePath,
			schema,
		});
		files.push(...cliCode.files);

		files.push({
			content: generateClientCliDockerfile(name),
			filename: `${packagePath}/Dockerfile`,
		});

		files.push({
			content: generateClientCliScenarioTest(
				schema,
				name,
				scenariosPackage,
				corePackage,
				hasAuth,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		return files;
	},
};
