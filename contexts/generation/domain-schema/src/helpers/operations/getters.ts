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
		Object.entries(context.commands).map(([name, definition]) => ({
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
		Object.entries(context.queries).map(([name, definition]) => ({
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

export type OperationKind = "command" | "function" | "query";

/**
 * Look up the kind of an operation by name. Returns undefined if no operation,
 * query, or function with that name exists in the schema.
 */
export const getOperationKind = (
	schema: DomainSchema,
	name: string,
): OperationKind | undefined => {
	for (const context of Object.values(schema.contexts)) {
		if (context.commands[name]) return "command";
		if (context.queries[name]) return "query";
		if (context.functions?.[name]) return "function";
	}
	return undefined;
};

/**
 * Look up the target tags for an operation, query, or function by name.
 * Returns an empty array if no matching operation exists.
 */
export const getOperationTags = (
	schema: DomainSchema,
	name: string,
): readonly string[] => {
	for (const context of Object.values(schema.contexts)) {
		const command = context.commands[name];
		if (command) return command.tags;
		const query = context.queries[name];
		if (query) return query.tags;
		const function_ = context.functions?.[name];
		if (function_) return function_.tags;
	}
	return [];
};
