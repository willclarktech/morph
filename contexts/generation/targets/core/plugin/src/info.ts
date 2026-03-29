import type { PluginContext } from "@morphdsl/plugin";

import type { DomainSchema, GeneratedFile, OperationDef, QualifiedEntry } from "@morphdsl/domain-schema";
import {
	contextNameToKebab,
	getEntitiesForContext,
	getFunctionsForContext,
	getOperationsForContext,
	getValueObjectsForContext,
} from "@morphdsl/domain-schema";
import {
	codeBlock,
	description,
	entities,
	errors,
	events,
	heading,
	joinSections,
	operations,
	valueObjects,
} from "@morphdsl/builder-readme";

export interface ContextCoreInfo {
	readonly contextName: string;
	readonly hasEntities: boolean;
	readonly hasFunctions: boolean;
	readonly hasOperations: boolean;
	readonly kebabName: string;
	readonly packageName: string;
}

export const toPackageScope = (name: string): string => name.toLowerCase();

export const getContextCoreInfo = (
	ctx: PluginContext,
	contextName: string,
): ContextCoreInfo => {
	const { schema, name } = ctx;
	const kebabName = contextNameToKebab(contextName);
	const scope = toPackageScope(name);

	const ops = getOperationsForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	const entitiesList = getEntitiesForContext(schema, contextName);

	return {
		contextName,
		hasEntities: entitiesList.length > 0,
		hasFunctions: functions.length > 0,
		hasOperations: ops.length > 0 || functions.length > 0,
		kebabName,
		packageName: `@${scope}/${kebabName}-core`,
	};
};

const generateCoreExample = (op: QualifiedEntry<OperationDef>): string => {
	const params = Object.entries(op.def.input)
		.filter(([, p]) => !p.optional && !p.sensitive)
		.map(([paramName]) => `${paramName}: "<value>"`)
		.join(", ");

	return `import { ${op.name} } from "@scope/core";\nimport { Effect } from "effect";\n\nconst result = await Effect.runPromise(\n  ${op.name}.execute({ ${params} }, {}).pipe(\n    Effect.provide(AppLayer)\n  )\n);`;
};

export const generateCoreReadme = (
	schema: DomainSchema,
	name: string,
	contextName: string,
): string => {
	const allOps = getOperationsForContext(schema, contextName);
	const allFuncs = getFunctionsForContext(schema, contextName);
	const hasEntities = getEntitiesForContext(schema, contextName).length > 0;
	const firstOp = allOps[0]?.name ?? allFuncs[0]?.name ?? "operationName";

	const scope = toPackageScope(name);
	const packageSuffix = contextNameToKebab(contextName);
	const packageName = `@${scope}/${packageSuffix}-core`;

	const quickStartCode = hasEntities
		? `import { ${firstOp}, MockHandlersLayer, InMemoryLayer } from "${packageName}";\nimport { Effect, Layer } from "effect";\n\nconst AppLayer = Layer.mergeAll(\n  MockHandlersLayer.pipe(Layer.provide(InMemoryLayer)),\n  InMemoryLayer,\n);\n\nconst result = await Effect.runPromise(\n  ${firstOp}.execute({ /* params */ }, {}).pipe(\n    Effect.provide(AppLayer)\n  )\n);`
		: `import { ${firstOp}, MockHandlersLayer } from "${packageName}";\nimport { Effect } from "effect";\n\nconst result = await Effect.runPromise(\n  ${firstOp}.execute({ /* params */ }, {}).pipe(\n    Effect.provide(MockHandlersLayer)\n  )\n);`;

	const quickStart = [
		heading(2, "Quick Start"),
		codeBlock(quickStartCode, "typescript"),
	].join("\n\n");

	return joinSections([
		heading(1, packageName),
		description(schema),
		quickStart,
		heading(2, "Operations"),
		operations(allOps, {
			exampleGenerator: (op: QualifiedEntry<OperationDef>) =>
				generateCoreExample(op),
			exampleLang: "typescript",
			headingLevel: 3,
			schema,
		}),
		entities(getEntitiesForContext(schema, contextName)),
		valueObjects(getValueObjectsForContext(schema, contextName)),
		events(schema),
		errors(schema),
	]);
};

/**
 * Contexts that don't generate -core packages.
 * Currently empty - all contexts with operations/functions generate core.
 */
const SKIP_CORE_CONTEXTS = new Set<string>();

export const shouldGenerateCore = (
	schema: DomainSchema,
	contextName: string,
): boolean => {
	if (SKIP_CORE_CONTEXTS.has(contextName)) {
		return false;
	}
	const ops = getOperationsForContext(schema, contextName);
	const functions = getFunctionsForContext(schema, contextName);
	return ops.length > 0 || functions.length > 0;
};

export const createContextFilteredSchema = (
	schema: DomainSchema,
	contextName: string,
): DomainSchema => {
	const context = schema.contexts[contextName];
	if (!context) {
		throw new Error(`Context "${contextName}" not found in schema`);
	}
	return {
		...schema,
		contexts: {
			[contextName]: context,
		},
	};
};
