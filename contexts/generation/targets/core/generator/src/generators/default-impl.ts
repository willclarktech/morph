/**
 * Default handler implementation generation.
 *
 * Generates impl.ts files that re-export from mock-impl.ts.
 * These default implementations are overridden when fixture impls are provided.
 */
import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getFunctionsFlat, getOperationsFlat } from "@morph/domain-schema";
import { toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate a default impl.ts that re-exports from mock-impl.ts.
 * This provides a default implementation that delegates to mock handlers.
 * Fixtures can override this with real implementations.
 */
export const generateDefaultImpl = (name: string): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	return [
		"// Default handler implementation - re-exports mock handler",
		"// Override this file with a real implementation in fixtures/impls/",
		"// Do not edit - regenerate from schema",
		"",
		`import { ${handlerName}Mock } from "./mock-impl";`,
		"",
		`export const ${handlerName}Live = ${handlerName}Mock;`,
		"",
	].join("\n");
};

/**
 * Generate all default impl.ts files for operations.
 * These are scaffold files - they won't overwrite existing impl.ts files.
 */
export const generateDefaultOperationImpls = (
	schema: DomainSchema,
): readonly GeneratedFile[] => {
	const operations = getOperationsFlat(schema);

	return Object.entries(operations).map(([name]) => ({
		content: generateDefaultImpl(name),
		filename: `operations/${toKebabCase(name)}/impl.ts`,
		scaffold: true,
	}));
};

/**
 * Generate all default impl.ts files for functions.
 * These are scaffold files - they won't overwrite existing impl.ts files.
 */
export const generateDefaultFunctionImpls = (
	schema: DomainSchema,
): readonly GeneratedFile[] => {
	const functions = getFunctionsFlat(schema);

	return Object.entries(functions).map(([name]) => ({
		content: generateDefaultImpl(name),
		filename: `operations/${toKebabCase(name)}/impl.ts`,
		scaffold: true,
	}));
};

/**
 * Generate all default impl.ts files for operations and functions.
 */
export const generateDefaultImpls = (
	schema: DomainSchema,
): readonly GeneratedFile[] => [
	...generateDefaultOperationImpls(schema),
	...generateDefaultFunctionImpls(schema),
];
