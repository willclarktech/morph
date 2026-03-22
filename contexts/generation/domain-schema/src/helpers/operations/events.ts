/**
 * Event and subscriber-related operation helpers.
 */

import type {
	CommandDef,
	ContextErrorDef,
	DomainSchema,
	EmittedEventDef,
	FunctionDef,
	OperationDef,
	PortDef,
	SubscriberDef,
} from "../../schemas";
import type { QualifiedEntry } from "../entities";

import { getAllCommands, getAllFunctions, getAllOperations } from "./getters";

/**
 * Command with its emitted events info.
 */
export interface CommandWithEvents {
	readonly command: CommandDef;
	readonly commandName: string;
	readonly context: string;
	readonly events: readonly EmittedEventDef[];
}

/**
 * Get all commands (operations that emit events).
 * All commands emit events by definition.
 */
export const getCommandsWithEvents = (
	schema: DomainSchema,
): readonly CommandWithEvents[] =>
	getAllCommands(schema).map((entry) => ({
		command: entry.def,
		commandName: entry.name,
		context: entry.context,
		events: entry.def.emits,
	}));

/**
 * Get all subscribers from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllSubscribers = (
	schema: DomainSchema,
): readonly QualifiedEntry<SubscriberDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.subscribers ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Error with operation context.
 */
export interface ErrorWithOperation {
	readonly description: string;
	readonly name: string;
	readonly operationName: string;
	readonly when: string;
}

/**
 * Get all unique errors from all operations and functions in the schema.
 * Deduplicates errors with the same name (across operations/functions).
 */
export const getAllErrors = (
	schema: DomainSchema,
): readonly ErrorWithOperation[] => {
	const seen = new Set<string>();
	const errors: ErrorWithOperation[] = [];

	// Collect errors from commands/queries
	for (const entry of getAllOperations(schema)) {
		for (const error of entry.def.errors) {
			if (!seen.has(error.name)) {
				seen.add(error.name);
				errors.push({
					description: error.description,
					name: error.name,
					operationName: entry.name,
					when: error.when,
				});
			}
		}
	}

	// Collect errors from functions (pure transformations)
	for (const entry of getAllFunctions(schema)) {
		for (const error of entry.def.errors) {
			if (!seen.has(error.name)) {
				seen.add(error.name);
				errors.push({
					description: error.description,
					name: error.name,
					operationName: entry.name,
					when: error.when,
				});
			}
		}
	}

	return errors.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Context-level error with its definition.
 */
export interface ContextErrorEntry {
	readonly context: string;
	readonly def: ContextErrorDef;
	readonly name: string;
}

/**
 * Get all context-level errors (errors with typed fields).
 * These are errors defined at the context level, not inline in operations.
 */
export const getAllContextErrors = (
	schema: DomainSchema,
): readonly ContextErrorEntry[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.errors ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Port entry with context.
 */
export interface PortEntry {
	readonly context: string;
	readonly def: PortDef;
	readonly name: string;
}

/**
 * Get all ports (DI contracts) from all contexts.
 */
export const getAllPorts = (schema: DomainSchema): readonly PortEntry[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		Object.entries(context.ports ?? {}).map(([name, definition]) => ({
			context: contextName,
			def: definition,
			name,
		})),
	);

/**
 * Get context-level errors for a specific context.
 */
export const getContextErrorsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly ContextErrorEntry[] =>
	getAllContextErrors(schema).filter((entry) => entry.context === contextName);

/**
 * Get ports for a specific context.
 */
export const getPortsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly PortEntry[] =>
	getAllPorts(schema).filter((entry) => entry.context === contextName);

/**
 * Get functions for a specific context.
 */
export const getFunctionsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly QualifiedEntry<FunctionDef>[] =>
	getAllFunctions(schema).filter((entry) => entry.context === contextName);

/**
 * Get operations (commands and queries) for a specific context.
 */
export const getOperationsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly QualifiedEntry<OperationDef>[] =>
	getAllOperations(schema).filter((entry) => entry.context === contextName);
