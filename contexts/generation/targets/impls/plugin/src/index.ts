import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import {
	getFunctionsForContext,
	getOperationsForContext,
} from "@morphdsl/domain-schema";
import { buildConfigFiles } from "@morphdsl/builder-app";
import { toKebabCase } from "@morphdsl/utils";

import {
	generateHandlerScaffold,
	generateImplsBarrel,
	getContextImplsInfo,
	shouldGenerateImpls,
} from "./info";
import { generateImplsPackageJson } from "./package-json";

export * from "./info";
export * from "./package-json";

const generateContextImplsPackage = (
	ctx: PluginContext,
	contextName: string,
): GeneratedFile[] => {
	const { schema, name } = ctx;
	const info = getContextImplsInfo(ctx, contextName);
	const packagePath = `libs/${info.kebabName}-impls`;
	const files: GeneratedFile[] = [];

	const operations = getOperationsForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	const operationNames = operations.map((op) => op.name);
	const functionNames = functions.map((f) => f.name);
	const allNames = [...operationNames, ...functionNames];

	files.push({
		content: generateImplsPackageJson(name, info),
		filename: `${packagePath}/package.json`,
	});

	files.push(...buildConfigFiles(packagePath, name));

	for (const handlerName of allNames) {
		files.push({
			content: generateHandlerScaffold(handlerName, info),
			filename: `${packagePath}/src/${toKebabCase(handlerName)}.ts`,
			scaffold: true,
		});
	}

	files.push({
		content: generateImplsBarrel(info, operationNames, functionNames),
		filename: `${packagePath}/src/index.ts`,
	});

	return files;
};

export const implsPlugin: GeneratorPlugin = {
	id: "lib-impls",
	kind: "lib",
	dependencies: ["lib-core"],
	metadata: {
		projectStructure: {
			path: "libs/*-impls/",
			description: "Per-context handler implementations",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema } = ctx;
		const files: GeneratedFile[] = [];

		for (const contextName of Object.keys(schema.contexts)) {
			if (shouldGenerateImpls(schema, contextName)) {
				files.push(...generateContextImplsPackage(ctx, contextName));
			}
		}

		return files;
	},
};
