import type {
	DomainSchema,
	FunctionDef,
	OperationDef,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllInvariants,
	getAllSubscribers,
	getFunctionsFlat,
	getOperationsFlat,
} from "@morphdsl/domain-schema";
import { toKebabCase, toPascalCase } from "@morphdsl/utils";

/**
 * Filter operations by tags (any match).
 */
const filterByTags = (
	operations: Readonly<Record<string, OperationDef>>,
	tags: readonly string[],
): Readonly<Record<string, OperationDef>> => {
	if (tags.length === 0) return operations;
	return Object.fromEntries(
		Object.entries(operations).filter(([, op]) =>
			tags.some((tag) => op.tags.includes(tag)),
		),
	);
};

/**
 * Filter functions by tags (any match).
 */
const filterFunctionsByTags = (
	functions: Readonly<Record<string, FunctionDef>>,
	tags: readonly string[],
): Readonly<Record<string, FunctionDef>> => {
	if (tags.length === 0) return functions;
	return Object.fromEntries(
		Object.entries(functions).filter(([, function_]) =>
			tags.some((tag) => function_.tags.includes(tag)),
		),
	);
};

/**
 * Generate the operations barrel file (operations/index.ts).
 * Includes both operations (commands/queries) and functions.
 *
 * Uses `export *` pattern for maintainability - each operation module's
 * exports are automatically included without manual listing.
 *
 * @param tags - Optional filter: only include items matching any tag
 * @param includeImpls - Whether to include mock handler layer (default: true)
 */
export const generateOperationsBarrel = (
	schema: DomainSchema,
	tags: readonly string[] = [],
	includeImpls = true,
): string => {
	// Get and filter operations
	const allOps = getOperationsFlat(schema);
	const filteredOps = filterByTags(allOps, tags);
	const operationNames = Object.keys(filteredOps).toSorted();

	// Get and filter functions
	const allFuncs = getFunctionsFlat(schema);
	const filteredFuncs = filterFunctionsByTags(allFuncs, tags);
	const functionNames = Object.keys(filteredFuncs).toSorted();

	// Combine all names for exports
	const allNames = [...operationNames, ...functionNames].toSorted();

	if (allNames.length === 0) {
		return "// No operations to export\nexport {};\n";
	}

	// Re-export all operations and functions using `export *` pattern
	const exports = allNames
		.map((name) => `export * from "./${toKebabCase(name)}";`)
		.join("\n");

	if (!includeImpls) {
		return `// Generated operations barrel\n\n${exports}\n`;
	}

	// For commands/queries the user-supplied Layer lives in `./<kebab>/impl`.
	// For functions, the Layer is generated and lives in `./<kebab>` (index.ts);
	// the impl file there is a plain function consumed by that index.
	const functionNameSet = new Set(functionNames);
	const allImports = allNames
		.flatMap((name) => {
			const kebab = toKebabCase(name);
			const livePath = functionNameSet.has(name)
				? `./${kebab}`
				: `./${kebab}/impl`;
			return [
				`import { ${toPascalCase(name)}HandlerLive } from "${livePath}";`,
				`import { ${toPascalCase(name)}HandlerMock } from "./${kebab}/mock-impl";`,
			];
		})
		.join("\n");

	const mockHandlersLayer = [
		"/**",
		" * Combined layer with mock handler implementations for testing.",
		" * Use this layer when you need arbitrary/generated test data.",
		" */",
		"export const MockHandlersLayer = Layer.mergeAll(",
		...allNames.map((name) => `\t${toPascalCase(name)}HandlerMock,`),
		");",
	].join("\n");

	const handlersLayer = [
		"/**",
		" * Combined layer with real handler implementations.",
		" * Use this layer for actual application behavior with repositories.",
		" */",
		"export const HandlersLayer = Layer.mergeAll(",
		...allNames.map((name) => `\t${toPascalCase(name)}HandlerLive,`),
		");",
	].join("\n");

	return [
		"// Generated operations barrel",
		"",
		'import { Layer } from "effect";',
		"",
		allImports,
		"",
		exports,
		"",
		mockHandlersLayer,
		"",
		handlersLayer,
		"",
	].join("\n");
};

/**
 * Generate the main barrel file (index.ts).
 *
 * In addition to the ops/services/etc. namespaces, pure functions that
 * declare no errors are re-exported at the top level by their natural name,
 * pulled straight from their impl files (`./operations/<kebab>/impl`). This
 * lets clients import them as plain functions without the Effect runtime;
 * paired with `sideEffects: false` in package.json, the Layer machinery is
 * tree-shaken away. Functions that declare errors aren't re-exported this
 * way — their impl returns an Effect, which the client could not consume
 * without pulling in the runtime anyway.
 */
export const generateMainBarrel = (schema: DomainSchema): string => {
	const hasEntities = getAllEntities(schema).length > 0;
	const hasSubscribers = getAllSubscribers(schema).length > 0;
	const hasInvariants = getAllInvariants(schema).some(
		(entry) =>
			entry.def.scope.kind === "entity" || entry.def.scope.kind === "context",
	);

	const pureFunctions = Object.entries(getFunctionsFlat(schema))
		.filter(([, fn]) => fn.errors.length === 0)
		.map(([name]) => name)
		.toSorted();
	const pureFunctionExports = pureFunctions.map(
		(name) =>
			`export { ${name} } from "./operations/${toKebabCase(name)}/impl";`,
	);

	const namespaceExports = [
		'export * as ops from "./operations";',
		...(hasEntities ? ['export * as services from "./services";'] : []),
		...(hasSubscribers
			? ['export * as subscribers from "./subscribers";']
			: []),
		...(hasInvariants ? ['export * as invariants from "./invariants";'] : []),
	];

	// Direct exports - operations are accessed via `ops` namespace only
	const directExports = [
		'export * from "./layers";',
		...(hasEntities ? ['export * from "./services";'] : []),
		...(hasSubscribers ? ['export * from "./subscribers";'] : []),
		...(hasInvariants ? ['export * from "./invariants";'] : []),
	];

	const lines = [
		"// Generated main barrel",
		"",
		"// Namespace exports for grouped imports",
		...namespaceExports,
		"",
		"// Direct exports for individual imports",
		...directExports,
		...(pureFunctionExports.length > 0
			? [
					"",
					"// Pure functions (no declared errors) — bundler tree-shakes the",
					"// Layer machinery so client packages can call these directly.",
					...pureFunctionExports,
				]
			: []),
		"",
	];

	return lines.join("\n");
};
