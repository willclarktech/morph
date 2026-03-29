/**
 * Mock handler implementation generation for functions.
 */
import type {
	DomainSchema,
	FunctionDef,
	GeneratedFile,
} from "@morphdsl/domain-schema";

import { getFunctionsFlat } from "@morphdsl/domain-schema";
import { indent, sortImports, toKebabCase, toPascalCase } from "@morphdsl/utils";

import type { MockImplOptions } from "./mock-operation-impl";

import {
	collectArbitraryImports,
	outputRequiresArbitraries,
	outputToArbitrary,
} from "./arbitraries";
import { schemaHasArbitraries } from "./mock-operation-impl";

const MOCK_SEED = 42;

/**
 * Generate a fallback mock for functions that doesn't use fast-check.
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
 * Generate a mock handler implementation file for a function.
 * Functions are simpler - no aggregate dependencies.
 */
export const generateMockFunctionHandlerImpl = (
	name: string,
	function_: FunctionDef,
	options: MockImplOptions,
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;
	const typesImportPath = options.typesImportPath;

	// Check if this function needs arbitraries that aren't available
	const needsArbitraries = outputRequiresArbitraries(function_.output);
	if (needsArbitraries && !options.hasArbitraries) {
		return generateFallbackMockHandlerImpl(name, handlerName);
	}

	// Collect arbitrary imports needed
	const arbitraryImports = collectArbitraryImports(function_.output);

	// Build arbitrary expression for the output
	const arbitraryExpr = outputToArbitrary(function_.output);

	// Build imports
	const arbitraryImportString =
		arbitraryImports.length > 0
			? `import { ${[...new Set(arbitraryImports)].toSorted().join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Handler import
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Build header
	const importBlock = sortImports(
		[
			'import { Effect, Layer } from "effect";',
			'import * as fc from "fast-check";',
			...(arbitraryImportString ? [arbitraryImportString.trim()] : []),
			handlerImport.trim(),
		].join("\n"),
	);

	const header = [
		"// Generated mock handler implementation for function",
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
 * Generate all mock handler implementation files for functions.
 */
export const generateMockFunctionHandlerImpls = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
): readonly GeneratedFile[] => {
	const functions = getFunctionsFlat(schema);
	const hasArbitraries = schemaHasArbitraries(schema);

	return Object.entries(functions).map(([name, function_]) => ({
		content: generateMockFunctionHandlerImpl(name, function_, {
			hasArbitraries,
			typesImportPath,
		}),
		filename: `operations/${toKebabCase(name)}/mock-impl.ts`,
		scaffold: false,
	}));
};
