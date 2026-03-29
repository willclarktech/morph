import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import { contextNameToKebab } from "@morphdsl/domain-schema";
import { getPackageScope } from "@morphdsl/plugin";
import { generate as generateApiAppEntry } from "@morphdsl/runtime-api";
import {
	buildConfigFiles,
	generateAppFiles,
} from "@morphdsl/builder-app";
import { generate as generateEnvironmentExample } from "@morphdsl/generator-env";
import { generate as generateOpenApi } from "@morphdsl/generator-openapi";
import { toEnvironmentPrefix } from "@morphdsl/utils";

import { detectPasswordAuth } from "./info";
import { generateApiDockerfile } from "./dockerfile";
import { generateApiPackageJson } from "./package-json";
import { generateApiScenarioTest } from "./tests";

export * from "./info";
export * from "./dockerfile";
export * from "./package-json";
export * from "./tests";

export const apiPlugin: GeneratorPlugin = {
	id: "app-api",
	kind: "app",
	tags: ["@api"],
	dependencies: ["lib-dsl", "lib-core"],
	metadata: {
		quickStartSteps: [
			{ description: "Start the API server:", command: "bun run --filter @{name}/api dev" },
		],
		projectStructure: { path: "apps/api/", description: "REST API server" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = `apps/api`;
		const scope = getPackageScope(schema, name);

		const primaryContext = ctx.features.primaryContext ?? "app";
		const contextKebab = contextNameToKebab(primaryContext);

		const corePackage = `@${scope}/${contextKebab}-core`;
		const dslPackage = `@${scope}/${contextKebab}-dsl`;
		const scenariosPackage = `@${scope}/scenarios`;
		const envPrefix = toEnvironmentPrefix(name);
		const features = ctx.features;
		const hasPasswordAuth = detectPasswordAuth(schema);
		const encodingFormats = schema.extensions?.encoding?.formats ?? [];
		const files: GeneratedFile[] = [];

		const appFiles = generateAppFiles({
			appType: "api",
			name,
			packagePath,
			generatePackageJson: () =>
				generateApiPackageJson(name, corePackage, dslPackage, hasPasswordAuth, encodingFormats, schema.npmScope),
			generateConfigFiles: () => buildConfigFiles(packagePath, name, schema.npmScope),
			generateAppEntry: () =>
				generateApiAppEntry({
					apiName: name,
					corePackagePath: corePackage,
					dslPackagePath: dslPackage,
					envPrefix,
					packageDir: packagePath,
					schema,
				}),
			generateEnvExample: () =>
				generateEnvironmentExample(envPrefix, "api", features),
			generateDockerfile: () => generateApiDockerfile(name),
		});
		files.push(...appFiles);

		const openApiResult = generateOpenApi(schema);
		for (const file of openApiResult.files) {
			files.push({
				...file,
				filename: `${packagePath}/${file.filename}`,
			});
		}

		files.push({
			content: generateApiScenarioTest(
				schema,
				scenariosPackage,
				dslPackage,
				corePackage,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		return files;
	},
};
