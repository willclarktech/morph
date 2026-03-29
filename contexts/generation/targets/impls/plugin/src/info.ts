import type { DomainSchema } from "@morphdsl/domain-schema";
import type { PluginContext } from "@morphdsl/plugin";

import {
	contextNameToKebab,
	getFunctionsForContext,
	getOperationsForContext,
} from "@morphdsl/domain-schema";
import { toPascalCase, toKebabCase } from "@morphdsl/utils";

export interface ContextImplsInfo {
	readonly contextName: string;
	readonly kebabName: string;
	readonly packageName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

const toPackageScope = (name: string, npmScope?: string): string =>
	npmScope ?? name.toLowerCase();

export const getContextImplsInfo = (
	ctx: PluginContext,
	contextName: string,
): ContextImplsInfo => {
	const { schema, name } = ctx;
	const kebabName = contextNameToKebab(contextName);
	const scope = toPackageScope(name, schema.npmScope);

	return {
		contextName,
		kebabName,
		packageName: `@${scope}/${kebabName}-impls`,
		corePackage: `@${scope}/${kebabName}-core`,
		dslPackage: `@${scope}/${kebabName}-dsl`,
	};
};

export const shouldGenerateImpls = (
	schema: DomainSchema,
	contextName: string,
): boolean => {
	const ops = getOperationsForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	return ops.length > 0 || functions.length > 0;
};

export const generateHandlerScaffold = (
	name: string,
	info: ContextImplsInfo,
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	return `// Handler implementation for ${name}
// This file is hand-maintained. Implement the operation logic below.

import { Effect, Layer } from "effect";

import { ${handlerName} } from "${info.corePackage}";

/**
 * Implementation of ${name}.
 */
export const ${handlerName}Live = Layer.succeed(
	${handlerName},
	{
		handle: (_params, _options) =>
			Effect.gen(function* () {
				// TODO: Implement ${name}
				throw new Error("Not implemented");
			}),
	},
);
`;
};

export const generateImplsBarrel = (
	info: ContextImplsInfo,
	operationNames: readonly string[],
	functionNames: readonly string[],
): string => {
	const allNames = [...operationNames, ...functionNames].toSorted();

	if (allNames.length === 0) {
		return `// No handlers to export
export {};
`;
	}

	const exports = allNames
		.map((name) => `export * from "./${toKebabCase(name)}";`)
		.join("\n");

	const imports = allNames
		.map(
			(name) =>
				`import { ${toPascalCase(name)}HandlerLive } from "./${toKebabCase(name)}";`,
		)
		.join("\n");

	const handlersLive = [
		"/**",
		" * Combined layer with all handler implementations.",
		" * Provide this layer to run operations with real implementations.",
		" */",
		"export const HandlersLive = Layer.mergeAll(",
		...allNames.map((name) => `\t${toPascalCase(name)}HandlerLive,`),
		");",
	].join("\n");

	return `// Generated impls barrel - re-exports all handlers and provides HandlersLive

import { Layer } from "effect";

${imports}

${exports}

${handlersLive}
`;
};
