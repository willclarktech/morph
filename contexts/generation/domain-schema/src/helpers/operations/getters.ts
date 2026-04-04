/**
 * Basic operation retrieval functions.
 */

import type {
	CommandDef,
	DomainSchema,
	FunctionDef,
	OperationDef,
	QueryDef,
} from "../../schemas";
import type { QualifiedEntry } from "../entities";

/**
 * Get all commands from all contexts.
 * Commands are state-changing operations that emit events.
 */
export const getAllCommands = (
	schema: DomainSchema,
): readonly QualifiedEntry<CommandDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.commands ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get all queries from all contexts.
 * Queries are read-only operations that don't emit events.
 */
export const getAllQueries = (
	schema: DomainSchema,
): readonly QualifiedEntry<QueryDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.queries ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get all operations (commands and queries) from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllOperations = (
	schema: DomainSchema,
): readonly QualifiedEntry<OperationDef>[] => [
	...getAllCommands(schema),
	...getAllQueries(schema),
];

/**
 * Get all functions from all contexts.
 * Functions are pure transformations without side effects.
 */
export const getAllFunctions = (
	schema: DomainSchema,
): readonly QualifiedEntry<FunctionDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.functions ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get a flat map of operation names to definitions.
 * Note: This assumes operation names are unique across contexts.
 * Use getAllOperations() for context-aware iteration.
 */
export const getOperationsFlat = (
	schema: DomainSchema,
): Readonly<Record<string, OperationDef>> =>
	Object.fromEntries(
		getAllOperations(schema).map((entry) => [entry.name, entry.def]),
	);

/**
 * Get a flat map of function names to definitions.
 * Note: This assumes function names are unique across contexts.
 * Use getAllFunctions() for context-aware iteration.
 */
export const getFunctionsFlat = (
	schema: DomainSchema,
): Readonly<Record<string, FunctionDef>> =>
	Object.fromEntries(
		getAllFunctions(schema).map((entry) => [entry.name, entry.def]),
	);
