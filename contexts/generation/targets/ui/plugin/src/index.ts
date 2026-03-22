import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";
import type { UiConfig } from "@morph/runtime-ui";

import { contextNameToKebab } from "@morph/domain-schema";
import { buildDockerfile, generateAppFiles } from "@morph/builder-app";
import { generate as generateEnvironmentExample } from "@morph/generator-env";
import {
	generate as generateUiAppEntry,
	generateUiPackageJson,
} from "@morph/runtime-ui";
import {
	generateInjectableParamsConfig,
	generateUiMappings,
} from "@morph/generator-ui-mappings";
import { toEnvironmentPrefix } from "@morph/utils";

const generateUiDockerfile = (name: string): string =>
	buildDockerfile({
		name,
		build: {
			libs: ["dsl", "client"],
			appDir: "ui",
			extraFiles: ["schema.json"],
		},
		production: {
			baseImage: "oven/bun:1-alpine",
			workdir: "/app/apps/ui",
			copyFrom: "full-app",
			port: 4000,
			healthCheckPath: "/",
			cmd: ["bun", "start"],
		},
	});

const generateUiScenarioTest = (
	schema: DomainSchema,
	name: string,
	scenariosPackage: string,
	corePackage: string,
): string => {
	const uiMappings = generateUiMappings(schema);
	const injectableParamsConfig = generateInjectableParamsConfig(schema);
	const envPrefix = name.toUpperCase().replaceAll("-", "_");

	return `import { createUiRunner } from "@morph/scenario-runner-ui";
import { prose } from "${corePackage}";
import { scenarios } from "${scenariosPackage}";
import { expect, test } from "bun:test";
import path from "node:path";

// Resolve paths from test file location (apps/ui/src/test/)
const appRoot = path.resolve(import.meta.dir, "../../../..");
const apiCwd = path.resolve(appRoot, "apps/api");
const uiCwd = path.resolve(appRoot, "apps/ui");

const runner = createUiRunner({
	apiServer: {
		command: "bun src/index.ts",
		cwd: apiCwd,
		port: 0,
	},
	envPrefix: "${envPrefix}",
	headless: true,${injectableParamsConfig}
	prose,
	reset: "restart",
	server: {
		command: "bun src/index.ts",
		cwd: uiCwd,
		healthPath: "/",
		port: 0,
	},
	uiMappings: ${uiMappings},
});

// UI tests require longer timeout for Playwright browser launch
test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
}, { timeout: 60_000 });
`;
};

export const uiPlugin: GeneratorPlugin = {
	id: "app-ui",
	kind: "app",
	tags: ["@ui"],
	dependencies: ["lib-dsl", "lib-client", "app-api"],
	metadata: {
		quickStartSteps: [
			{
				description: "Start the UI (in another terminal):",
				command: "bun run --filter @{name}/ui dev",
			},
		],
		projectStructure: { path: "apps/ui/", description: "Web UI" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name, config } = ctx;
		const packagePath = `apps/ui`;
		const scope = name.toLowerCase();

		const primaryContext = ctx.features.primaryContext ?? "app";
		const contextKebab = contextNameToKebab(primaryContext);

		const clientPackage = `@${scope}/client`;
		const corePackage = `@${scope}/${contextKebab}-core`;
		const dslPackage = `@${scope}/${contextKebab}-dsl`;
		const scenariosPackage = `@${scope}/scenarios`;
		const envPrefix = toEnvironmentPrefix(name);
		const features = ctx.features;
		const files: GeneratedFile[] = [];

		const extensions = schema.extensions;
		const textConfig = config?.textConfig;
		const uiConfig = config?.uiConfig as UiConfig | undefined;

		const appFiles = generateAppFiles({
			appType: "ui",
			name,
			packagePath,
			generatePackageJson: () =>
				generateUiPackageJson(name, clientPackage, dslPackage, corePackage),
			generateConfigFiles: () => [],
			generateAppEntry: () =>
				generateUiAppEntry({
					appName: schema.name,
					clientPackagePath: clientPackage,
					dslPackagePath: dslPackage,
					envPrefix,
					packageDir: packagePath,
					schema,
					uiName: name,
					...(extensions?.i18n && { i18nConfig: extensions.i18n }),
					...(textConfig && { textConfig }),
					...(uiConfig && { uiConfig }),
				}),
			generateEnvExample: () =>
				generateEnvironmentExample(envPrefix, "ui", features),
			generateDockerfile: () => generateUiDockerfile(name),
		});
		files.push(...appFiles);

		files.push({
			content: generateUiScenarioTest(
				schema,
				name,
				scenariosPackage,
				corePackage,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		return files;
	},
};
