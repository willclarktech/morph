import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import {
	contextNameToKebab,
	getAllFunctions,
	getContextsWithTag,
} from "@morphdsl/domain-schema";
import { getPackageScope } from "@morphdsl/plugin";
import { buildConfigFiles } from "@morphdsl/builder-app";
import { generate as generateClient } from "@morphdsl/runtime-client";

import { generateClientReadme } from "./info";
import { generateClientPackageJson } from "./package-json";
import { generateClientScenarioTest } from "./tests";

export * from "./info";
export * from "./package-json";
export * from "./tests";

export const clientPlugin: GeneratorPlugin = {
	id: "lib-client",
	kind: "lib",
	tags: ["@api"],
	dependencies: ["lib-dsl", "app-api"],
	metadata: {
		projectStructure: { path: "libs/client/", description: "HTTP client" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = `libs/client`;
		const scope = getPackageScope(schema, name);

		const apiContexts = getContextsWithTag(schema, "@api");

		const dslPackages = [...apiContexts]
			.sort()
			.map((ctx) => `@${scope}/${contextNameToKebab(ctx)}-dsl`);

		// Core packages from which the client re-exports bundled pure functions
		// (no declared errors). Needed as runtime deps when present.
		const bundledCoreContexts = [
			...new Set(
				getAllFunctions(schema)
					.filter((f) => f.def.errors.length === 0)
					.map((f) => f.context),
			),
		].sort();
		const bundledCorePackages = bundledCoreContexts.map(
			(c) => `@${scope}/${contextNameToKebab(c)}-core`,
		);

		const primaryContext =
			[...apiContexts].sort()[0] ??
			Object.keys(schema.contexts)[0] ??
			"app";
		const primaryContextKebab = contextNameToKebab(primaryContext);
		const corePackage = `@${scope}/${primaryContextKebab}-core`;
		const scenariosPackage = `@${scope}/scenarios`;
		const files: GeneratedFile[] = [];

		files.push({
			content: generateClientPackageJson(
				name,
				dslPackages,
				corePackage,
				schema.npmScope,
				bundledCorePackages,
			),
			filename: `${packagePath}/package.json`,
		});

		files.push(...buildConfigFiles({ packagePath, name, npmScope: schema.npmScope, publishable: true }));

		const clientCode = generateClient(schema, { appName: name, scope });
		if (clientCode) {
			files.push({
				content: clientCode,
				filename: `${packagePath}/src/client.ts`,
			});

			files.push({
				content: `export type { ClientConfig, HttpClientError } from "@morphdsl/http-client";
export type { Client } from "./client";
export { createClient } from "./client";
`,
				filename: `${packagePath}/src/index.ts`,
			});

			files.push({
				content: generateClientReadme(schema, name),
				filename: `${packagePath}/README.md`,
			});
		}

		files.push({
			content: generateClientScenarioTest(schema, scenariosPackage, corePackage),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		return files;
	},
};
