import type { GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import {
	findPrimaryContext,
	getContextsWithTag,
} from "@morph/domain-schema";
import {
	buildCliConfigFiles,
	generateAppFiles,
} from "@morph/builder-app";
import { generate as generateApp } from "@morph/runtime-cli";
import { generate as generateEnvironmentExample } from "@morph/generator-env";
import { toEnvironmentPrefix, toKebabCase } from "@morph/utils";

import { generateCliDockerfile } from "./dockerfile";
import { generateCliPackageJson } from "./package-json";
import { generateCliPropertyTest, generateCliScenarioTest } from "./tests";

export * from "./dockerfile";
export * from "./package-json";
export * from "./tests";

interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

export const cliPlugin: GeneratorPlugin = {
	id: "app-cli",
	kind: "app",
	tags: ["@cli"],
	dependencies: ["lib-dsl", "lib-core"],
	metadata: {
		quickStartSteps: [
			{
				description: "Run the CLI:",
				command: "bun run --filter @{name}/cli start -- --help",
			},
		],
		projectStructure: { path: "apps/cli/", description: "CLI" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = `apps/cli`;
		const scope = name.toLowerCase();

		const cliContexts = getContextsWithTag(schema, "@cli");
		const usePrefix = cliContexts.length > 1;

		const contexts: ContextPackages[] = cliContexts.map((contextName) => {
			const contextKebab = toKebabCase(contextName);
			return {
				contextName,
				corePackage: `@${scope}/${contextKebab}-core`,
				dslPackage: `@${scope}/${contextKebab}-dsl`,
			};
		});

		if (contexts.length === 0) {
			const primaryContext = findPrimaryContext(schema);
			const contextKebab = toKebabCase(primaryContext ?? "app");
			contexts.push({
				contextName: primaryContext ?? "app",
				corePackage: `@${scope}/${contextKebab}-core`,
				dslPackage: `@${scope}/${contextKebab}-dsl`,
			});
		}

		const scenariosPackage = `@${scope}/scenarios`;
		const propertiesPackage = `@${scope}/properties`;
		const envPrefix = toEnvironmentPrefix(name);
		const { features } = ctx;
		const files: GeneratedFile[] = [];

		const encodingFormats = schema.extensions?.encoding?.formats ?? [];

		const appFiles = generateAppFiles({
			appType: "cli",
			name,
			packagePath,
			generatePackageJson: () =>
				generateCliPackageJson({
					contexts,
					encodingFormats,
					hasAuth: features.hasAuth,
					hasEntities: features.hasEntities,
					hasPropertyTests: features.hasPropertyTests,
					projectName: name,
					propertiesPackage,
					scenariosPackage,
				}),
			generateConfigFiles: () => buildCliConfigFiles(packagePath, name),
			generateAppEntry: () =>
				generateApp({
					cliName: toKebabCase(name),
					contexts,
					envPrefix,
					packageDir: packagePath,
					schema,
					usePrefix,
				}),
			generateEnvExample: () =>
				generateEnvironmentExample(envPrefix, "cli", features),
			generateDockerfile: () => generateCliDockerfile(name),
		});
		files.push(...appFiles);

		files.push({
			content: generateCliScenarioTest(
				schema,
				name,
				scenariosPackage,
				contexts,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		if (features.hasPropertyTests) {
			files.push({
				content: generateCliPropertyTest(schema, name, propertiesPackage),
				filename: `${packagePath}/src/test/properties.test.ts`,
			});
		}

		return files;
	},
};
