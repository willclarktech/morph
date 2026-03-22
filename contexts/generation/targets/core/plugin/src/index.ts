import type { GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import {
	getCommandsWithEvents,
	getEntitiesForContext,
	getOperationsForContext,
	getValueObjectsForContext,
} from "@morph/domain-schema";
import { buildConfigFiles } from "@morph/builder-app";
import { generate as generateOperations } from "@morph/generator-core";

import {
	createContextFilteredSchema,
	generateCoreReadme,
	getContextCoreInfo,
	shouldGenerateCore,
	toPackageScope,
} from "./info";
import { generateCorePackageJson } from "./package-json";
import { generateCorePropertyTest, generateCoreScenarioTest } from "./tests";

export * from "./info";
export * from "./package-json";
export * from "./tests";

const generateContextCorePackage = (
	ctx: PluginContext,
	contextName: string,
): GeneratedFile[] => {
	const { schema, name } = ctx;
	const scope = toPackageScope(name);
	const info = getContextCoreInfo(ctx, contextName);
	const packagePath = `contexts/${info.kebabName}/core`;
	const dslPackage = `@${scope}/${info.kebabName}-dsl`;
	const scenariosPackage = `@${scope}/scenarios`;
	const propertiesPackage = `@${scope}/properties`;
	const corePackage = info.packageName;
	const files: GeneratedFile[] = [];

	const extensions = schema.extensions;
	const hasProperties = ctx.features.hasPropertyTests;
	const allEntities = getEntitiesForContext(schema, contextName);
	const allValueObjects = getValueObjectsForContext(schema, contextName);
	const allOperations = getOperationsForContext(schema, contextName);
	const hasArbitraries = allEntities.length > 0 || allValueObjects.length > 0;
	// Mock implementations always need fast-check for arbitrary generation
	const needsFastCheck = hasProperties || hasArbitraries || info.hasOperations;
	const hasEvents = getCommandsWithEvents(schema).length > 0;
	const authProviders = extensions?.auth?.providers ?? [];
	const storageBackends = extensions?.storage?.backends ?? [];
	const eventStoreBackends =
		extensions?.eventStore?.backends ?? (hasEvents ? ["memory"] : []);
	const hasScenarioTests = allOperations.length > 0;

	files.push({
		content: generateCorePackageJson(
			name,
			info,
			dslPackage,
			needsFastCheck,
			authProviders,
			storageBackends,
			eventStoreBackends,
			hasProperties,
			hasScenarioTests,
		),
		filename: `${packagePath}/package.json`,
	});

	files.push(...buildConfigFiles(packagePath, name));

	// Create a filtered schema with only this context for generation
	const filteredSchema = createContextFilteredSchema(schema, contextName);

	const envPrefix = name.toUpperCase().replaceAll("-", "_");
	const ops = generateOperations(filteredSchema, {
		envPrefix,
		extensions,
		generateImpls: true,
		outputDir: `${packagePath}/src`,
		projectName: name,
		typesImportPath: dslPackage,
	});
	files.push(...ops.files);

	files.push({
		content: generateCoreReadme(schema, name, contextName),
		filename: `${packagePath}/README.md`,
	});

	// Only generate scenario tests for contexts with operations (not just functions)
	if (hasScenarioTests) {
		files.push({
			content: generateCoreScenarioTest(
				schema,
				scenariosPackage,
				dslPackage,
				corePackage,
				contextName,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});
	}

	if (hasProperties) {
		files.push({
			content: generateCorePropertyTest(
				schema,
				propertiesPackage,
				corePackage,
				contextName,
			),
			filename: `${packagePath}/src/test/properties.test.ts`,
		});
	}

	return files;
};

export const corePlugin: GeneratorPlugin = {
	id: "lib-core",
	kind: "lib",
	dependencies: ["lib-dsl"],
	metadata: {
		projectStructure: {
			path: "contexts/*/core/",
			description: "Per-context business logic",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema } = ctx;
		const files: GeneratedFile[] = [];

		for (const contextName of Object.keys(schema.contexts)) {
			if (shouldGenerateCore(schema, contextName)) {
				files.push(...generateContextCorePackage(ctx, contextName));
			}
		}

		return files;
	},
};
