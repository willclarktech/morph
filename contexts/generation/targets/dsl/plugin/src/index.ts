import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import {
	contextNameToKebab,
	getAllFunctions,
	getAllOperations,
	getContextDependencies,
} from "@morphdsl/domain-schema";
import { buildConfigFiles } from "@morphdsl/builder-app";
import { generate as generateProperties } from "@morphdsl/generator-properties";
import { generate as generateScenarios } from "@morphdsl/generator-scenarios";
import {
	generateArbitraries,
	generateErrors,
	generatePorts,
	generateSchemaWrapper,
	generateSchemas,
} from "@morphdsl/generator-types";

import { generateContextDsl } from "./context-dsl";
import {
	generateContextIndex,
	getContextPackageInfo,
	toPackageScope,
} from "./info";
import {
	generateContextDslPackageJson,
	generatePropertiesPackageJson,
	generateScenariosPackageJson,
} from "./package-json";

export * from "./info";
export * from "./package-json";

const generateContextDslPackage = (
	ctx: PluginContext,
	contextName: string,
	isPrimary: boolean,
): GeneratedFile[] => {
	const { schema, name } = ctx;
	const scope = toPackageScope(name, schema.npmScope);
	const info = getContextPackageInfo(ctx, contextName);
	const packagePath = `contexts/${info.kebabName}/dsl`;
	const files: GeneratedFile[] = [];

	const depContexts = getContextDependencies(schema, contextName);
	const depPackages = depContexts.map(
		(dep) => `@${scope}/${contextNameToKebab(dep)}-dsl`,
	);

	files.push({
		content: generateContextDslPackageJson(name, info, depPackages, isPrimary, schema.npmScope),
		filename: `${packagePath}/package.json`,
	});

	files.push(...buildConfigFiles({ packagePath, name, npmScope: schema.npmScope }));

	if (info.hasTypes) {
		const schemasContent = generateSchemas(schema, { contextName });
		if (schemasContent) {
			files.push({
				content: `// Generated from DomainSchema: ${schema.name}\n// Do not edit manually\n\n${schemasContent}`,
				filename: `${packagePath}/src/schemas.ts`,
			});
		}
	}

	if (info.hasErrors) {
		const errorsContent = generateErrors(schema, { contextName });
		if (errorsContent) {
			files.push({
				content: errorsContent,
				filename: `${packagePath}/src/errors.ts`,
			});
		}
	}

	if (info.hasPorts) {
		const portsContent = generatePorts(schema, {
			contextName,
			packageScope: name,
		});
		if (portsContent) {
			files.push({
				content: portsContent,
				filename: `${packagePath}/src/ports.ts`,
			});
		}
	}

	if (info.hasArbitraries) {
		const arbitrariesContent = generateArbitraries(schema, {
			contextName,
			schemasImportPath: "./schemas",
		});
		if (arbitrariesContent) {
			files.push({
				content: arbitrariesContent,
				filename: `${packagePath}/src/arbitraries.ts`,
			});
		}
	}

	const context = schema.contexts[contextName];
	if (context && info.hasOperations) {
		const dslContent = generateContextDsl(contextName, context, {
			dependencyImports: depContexts.map((dep) => ({
				contextName: dep,
				packageName: `@${scope}/${contextNameToKebab(dep)}-dsl`,
			})),
			typesImportPath: "./schemas",
		});
		files.push({
			content: dslContent,
			filename: `${packagePath}/src/${contextNameToKebab(contextName)}.ts`,
		});
	}

	const indexContent = generateContextIndex(info, depContexts);
	files.push({
		content: indexContent,
		filename: `${packagePath}/src/index.ts`,
	});

	return files;
};

const generateScenariosPackage = (ctx: PluginContext): GeneratedFile[] => {
	const { schema, name } = ctx;
	const scope = toPackageScope(name, schema.npmScope);
	const packagePath = `tests/scenarios`;

	const contextNames = Object.keys(schema.contexts);
	const dslPackages = contextNames.map(
		(contextName) => `@${scope}/${contextNameToKebab(contextName)}-dsl`,
	);

	const primaryDslPackage = dslPackages[0] ?? `@${scope}/dsl`;

	return generateScenarios(schema, {
		dslPackage: primaryDslPackage,
		name,
		packagePath,
		generatePackageJson: () =>
			generateScenariosPackageJson(name, [primaryDslPackage], schema.npmScope),
		generateConfigFiles: () => buildConfigFiles({ packagePath, name, npmScope: schema.npmScope }),
	});
};

const generatePropertiesPackage = (ctx: PluginContext): GeneratedFile[] => {
	const { schema, name } = ctx;
	const scope = toPackageScope(name, schema.npmScope);
	const packagePath = `tests/properties`;

	const dslPackages = Object.keys(schema.contexts).map(
		(contextName) => `@${scope}/${contextNameToKebab(contextName)}-dsl`,
	);

	const primaryDslPackage = dslPackages[0] ?? `@${scope}/dsl`;

	return generateProperties(schema, {
		dslPackage: primaryDslPackage,
		name,
		packagePath,
		generatePackageJson: () =>
			generatePropertiesPackageJson(name, [primaryDslPackage], schema.npmScope),
		generateConfigFiles: () => buildConfigFiles({ packagePath, name, npmScope: schema.npmScope }),
	});
};

export const dslPlugin: GeneratorPlugin = {
	id: "lib-dsl",
	kind: "lib",
	dependencies: [],
	metadata: {
		projectStructure: {
			path: "contexts/*/dsl/",
			description: "Per-context domain types and DSL",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const scope = toPackageScope(name, schema.npmScope);
		const files: GeneratedFile[] = [];
		const contextNames = Object.keys(schema.contexts);

		for (const contextName of contextNames) {
			const isPrimary = contextName === contextNames[0];
			files.push(...generateContextDslPackage(ctx, contextName, isPrimary));
		}

		const primaryContext = contextNames[0];
		if (primaryContext) {
			const kebabName = contextNameToKebab(primaryContext);
			const packagePath = `contexts/${kebabName}/dsl`;

			const schemaWrapper = generateSchemaWrapper(schema, "../../../../schema.json");
			files.push({
				content: schemaWrapper.content,
				filename: `${packagePath}/src/schema.ts`,
			});

			const indexPath = `${packagePath}/src/index.ts`;
			const indexFileIndex = files.findIndex((f) => f.filename === indexPath);
			const indexFile = files[indexFileIndex];
			if (indexFileIndex !== -1 && indexFile) {
				const schemaExport = `\n// Schema (runtime parsed)\nexport { ${schema.name.toLowerCase()}Schema } from "./schema";\n`;
				files[indexFileIndex] = {
					content: indexFile.content + schemaExport,
					filename: indexFile.filename,
					...(indexFile.scaffold !== undefined && { scaffold: indexFile.scaffold }),
				};
			}
		}

		const hasOperationsOrFunctions =
			getAllOperations(schema).length > 0 ||
			getAllFunctions(schema).length > 0;
		if (hasOperationsOrFunctions) {
			files.push(...generateScenariosPackage(ctx));
		}

		if (ctx.features.hasPropertyTests) {
			files.push(...generatePropertiesPackage(ctx));
		}

		return files;
	},
};
