/**
 * Domain service operation helpers.
 */

import type { AggregateRef, DomainSchema } from "../../schemas";

import { getAllOperations } from "./getters";

/**
 * Get the aggregate dependencies for an operation.
 * Returns the `uses` array from the operation definition.
 */
export const getOperationAggregates = (
	schema: DomainSchema,
	operationName: string,
): readonly AggregateRef[] => {
	const operation = getAllOperations(schema).find(
		(op) => op.name === operationName,
	);
	return operation?.def.uses ?? [];
};

/**
 * Check if an operation is a domain service (uses multiple aggregates).
 * Domain services coordinate across aggregate boundaries.
 */
export const isDomainService = (
	schema: DomainSchema,
	operationName: string,
): boolean => {
	const aggregates = getOperationAggregates(schema, operationName);
	return aggregates.length > 1;
};

/**
 * Get the primary write aggregate for an operation.
 * Used for REST routing - domain services route under their primary aggregate.
 * Returns the first write aggregate in the uses array, or undefined if none.
 */
export const getPrimaryWriteAggregate = (
	schema: DomainSchema,
	operationName: string,
): string | undefined => {
	const aggregates = getOperationAggregates(schema, operationName);
	const writeAgg = aggregates.find((a) => a.access === "write");
	return writeAgg?.aggregate;
};

/**
 * Convert a string to kebab-case.
 */
const toKebabCase = (string_: string): string =>
	string_
		.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
		.replaceAll(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

/**
 * Get the action name for a domain service route.
 * Strips the aggregate suffix from the operation name for cleaner URLs.
 *
 * Examples:
 * - transferTodos with Todo → "transfer"
 * - archiveUser with User → "archive"
 * - reconcileData with Data → "reconcile"
 * - processOrder with Order → "process"
 *
 * If no suffix match, returns the full operation name in kebab-case.
 */
export const getDomainServiceAction = (
	operationName: string,
	primaryAggregate: string,
): string => {
	const nameLower = operationName.toLowerCase();
	const aggLower = primaryAggregate.toLowerCase();
	const aggPluralLower = aggLower + "s";

	// Try to strip aggregate suffix (singular or plural)
	let actionPart: string | undefined;

	if (nameLower.endsWith(aggPluralLower)) {
		// transferTodos → transfer
		actionPart = operationName.slice(0, -aggPluralLower.length);
	} else if (nameLower.endsWith(aggLower)) {
		// archiveUser → archive
		actionPart = operationName.slice(0, -aggLower.length);
	}

	if (actionPart && actionPart.length > 0) {
		return toKebabCase(actionPart);
	}

	// No match - use full operation name
	return toKebabCase(operationName);
};
