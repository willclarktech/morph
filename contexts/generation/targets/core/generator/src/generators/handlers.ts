/**
 * Handler interface generation orchestration.
 */
import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getFunctionsFlat, getOperationsFlat } from "@morph/domain-schema";
import { toKebabCase } from "@morph/utils";

import { generateFunctionHandler } from "./function-handler";
import { generateHandler } from "./operation-handler";

// Re-export the individual generators
export { generateFunctionHandler } from "./function-handler";
export { generateHandler } from "./operation-handler";

/**
 * Generate all handler files for a schema (commands and queries).
 */
export const generateHandlers = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
	projectName = "app",
): readonly GeneratedFile[] => {
	const operations = getOperationsFlat(schema);

	return Object.entries(operations).map(([name, operation]) => ({
		content: generateHandler(name, operation, typesImportPath, projectName),
		filename: `operations/${toKebabCase(name)}/handler.ts`,
	}));
};

/**
 * Generate all handler files for functions in a schema.
 */
export const generateFunctionHandlers = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
	projectName = "app",
): readonly GeneratedFile[] => {
	const functions = getFunctionsFlat(schema);

	return Object.entries(functions).map(([name, function_]) => ({
		content: generateFunctionHandler(
			name,
			function_,
			typesImportPath,
			projectName,
		),
		filename: `operations/${toKebabCase(name)}/handler.ts`,
	}));
};
