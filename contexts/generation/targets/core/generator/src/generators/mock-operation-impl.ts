/**
 * Mock handler implementation generation for operations.
 */
import type {
	DomainSchema,
	GeneratedFile,
	OperationDef,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllValueObjects,
	getOperationsFlat,
} from "@morphdsl/domain-schema";
import {
	indent,
	sortImports,
	toKebabCase,
	toPascalCase,
} from "@morphdsl/utils";

import {
	collectArbitraryImports,
	outputRequiresArbitraries,
	outputToArbitrary,
} from "./arbitraries";

const MOCK_SEED = 42;

export interface MockImplOptions {
	/** Whether arbitraries are available in the DSL package */
	readonly hasArbitraries: boolean;
	/** Import path for types/schemas */
	readonly typesImportPath: string;
}

/**
 * Check if a schema has arbitraries (entities or value objects).
 */
export const schemaHasArbitraries = (schema: DomainSchema): boolean => {
	const entities = getAllEntities(schema);
	const valueObjects = getAllValueObjects(schema);
	return entities.length > 0 || valueObjects.length > 0;
};

/**
 * Generate a fallback mock that doesn't use fast-check.
 * Used when arbitraries aren't available for the output type.
 */
const generateFallbackMockHandlerImpl = (
	name: string,
	handlerName: string,
): string => {
	const importBlock = sortImports(
		[
			'import { Effect, Layer } from "effect";',
			`import { ${handlerName} } from "./handler";`,
		].join("\n"),
	);

	const header = [
		"// Generated mock handler implementation (fallback - no arbitraries available)",
		"// Returns a stub error since proper mocks require arbitraries",
		"// Do not edit - regenerate from schema",
		"",
		importBlock,
		"",
	].join("\n");

	const body = [
		`export const ${handlerName}Mock = Layer.succeed(`,
		indent(`${handlerName},`, 1),
		indent(`{`, 1),
		indent(`handle: (_params, _options) =>`, 2),
		indent(
			`Effect.die(new Error("Mock not available: ${name} requires arbitraries")),`,
			3,
		),
		indent(`},`, 1),
		`);`,
		"",
	].join("\n");

	return header + body;
};

/**
 * Generate a mock handler implementation file for an operation.
 * Mocks return deterministically-seeded random data from arbitraries.
 */
export const generateMockHandlerImpl = (
	name: string,
	operation: OperationDef,
	options: MockImplOptions,
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;
	const typesImportPath = options.typesImportPath;

	// Check if this operation needs arbitraries that aren't available
	const needsArbitraries = outputRequiresArbitraries(operation.output);
	if (needsArbitraries && !options.hasArbitraries) {
		return generateFallbackMockHandlerImpl(name, handlerName);
	}

	// Collect arbitrary imports needed
	const arbitraryImports = collectArbitraryImports(operation.output);

	// Build arbitrary expression for the output
	const arbitraryExpr = outputToArbitrary(operation.output);

	// Build imports
	const arbitraryImportString =
		arbitraryImports.length > 0
			? `import { ${[...new Set(arbitraryImports)].toSorted().join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Handler import (handler.ts is in same operation module)
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Build header with imports in correct order
	const importBlock = sortImports(
		[
			'import { Effect, Layer } from "effect";',
			'import * as fc from "fast-check";',
			...(arbitraryImportString ? [arbitraryImportString.trim()] : []),
			handlerImport.trim(),
		].join("\n"),
	);

	const header = [
		"// Generated mock handler implementation",
		"// Returns deterministic random data using fast-check arbitraries",
		"// Do not edit - regenerate from schema",
		"",
		importBlock,
		"",
	].join("\n");

	// Non-null assertion is safe because numRuns: 1 always returns exactly one element
	const syncBody = `const results = fc.sample(${arbitraryExpr}, { seed: MOCK_SEED, numRuns: 1 });
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- numRuns: 1 guarantees one element
return results[0]!;`;

	const body = [
		`const MOCK_SEED = ${MOCK_SEED};`,
		"",
		`export const ${handlerName}Mock = Layer.succeed(`,
		indent(`${handlerName},`, 1),
		indent(`{`, 1),
		indent(`handle: (_params, _options) =>`, 2),
		indent(`Effect.sync(() => {`, 3),
		indent(syncBody, 4),
		indent(`}),`, 3),
		indent(`},`, 1),
		`);`,
		"",
	].join("\n");

	return header + body;
};

/**
 * Generate all mock handler implementation files for operations.
 * These are regenerated (not scaffolds).
 */
export const generateMockHandlerImpls = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
): readonly GeneratedFile[] => {
	const operations = getOperationsFlat(schema);
	const hasArbitraries = schemaHasArbitraries(schema);

	return Object.entries(operations).map(([name, operation]) => ({
		content: generateMockHandlerImpl(name, operation, {
			hasArbitraries,
			typesImportPath,
		}),
		filename: `operations/${toKebabCase(name)}/mock-impl.ts`,
		scaffold: false,
	}));
};
