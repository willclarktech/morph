import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getFunctionsFlat, getOperationsFlat } from "@morph/domain-schema";
import { toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate the MockHandlersLayer file that combines all mock handler layers.
 */
export const generateMockHandlersLayer = (
	schema: DomainSchema,
): GeneratedFile => {
	const operations = getOperationsFlat(schema);
	const functions = getFunctionsFlat(schema);

	const operationNames = Object.keys(operations).toSorted();
	const functionNames = Object.keys(functions).toSorted();
	const allNames = [...operationNames, ...functionNames].toSorted();

	if (allNames.length === 0) {
		return {
			content:
				'// No mock handlers to export\nimport { Layer } from "effect";\n\nexport const MockHandlersLayer = Layer.empty;\n',
			filename: "mocks/handlers.ts",
		};
	}

	// Import mock implementations from each operation
	const mockImports = allNames
		.map(
			(name) =>
				`import { ${toPascalCase(name)}HandlerMock } from "../operations/${toKebabCase(name)}/mock-impl";`,
		)
		.join("\n");

	// Generate MockHandlersLayer combining all mocks
	const mockHandlersLayer = [
		"/**",
		" * Combined layer with all mock handler implementations.",
		" * Returns deterministic random data using fast-check arbitraries.",
		" */",
		"export const MockHandlersLayer = Layer.mergeAll(",
		...allNames.map((name) => `\t${toPascalCase(name)}HandlerMock,`),
		");",
	].join("\n");

	const content = [
		"// Generated mock handlers layer",
		"// Combines all mock handler implementations for testing",
		"// Do not edit - regenerate from schema",
		"",
		'import { Layer } from "effect";',
		"",
		mockImports,
		"",
		mockHandlersLayer,
		"",
	].join("\n");

	return {
		content,
		filename: "mocks/handlers.ts",
	};
};
