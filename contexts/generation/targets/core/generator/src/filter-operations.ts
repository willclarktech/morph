/**
 * Tag-based filtering for operations and functions.
 */
import type {
	DomainSchema,
	FunctionDef,
	OperationDef,
} from "@morphdsl/domain-schema";

import { getFunctionsFlat, getOperationsFlat } from "@morphdsl/domain-schema";

/**
 * Filter operations by tags.
 */
export const filterOperations = (
	schema: DomainSchema,
	tags: readonly string[],
): Readonly<Record<string, OperationDef>> => {
	const allOperations = getOperationsFlat(schema);

	if (tags.length === 0) {
		return allOperations;
	}

	return Object.fromEntries(
		Object.entries(allOperations).filter(([, operation]) =>
			tags.some((tag) => operation.tags.includes(tag)),
		),
	);
};

/**
 * Filter functions by tags.
 */
export const filterFunctions = (
	schema: DomainSchema,
	tags: readonly string[],
): Readonly<Record<string, FunctionDef>> => {
	const allFunctions = getFunctionsFlat(schema);

	if (tags.length === 0) {
		return allFunctions;
	}

	return Object.fromEntries(
		Object.entries(allFunctions).filter(([, function_]) =>
			tags.some((tag) => function_.tags.includes(tag)),
		),
	);
};
