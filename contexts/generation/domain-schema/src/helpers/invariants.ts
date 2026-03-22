/**
 * Invariant helper functions (conditions, auth, injection).
 */

import type { DomainSchema, InvariantDef } from "../schemas";
import type { QualifiedEntry } from "./entities";
import type { InjectableParam } from "./injectable-params";

import { conditionReferencesCurrentUser } from "./current-user-references";
import { extractInjectableParams } from "./injectable-params";
import {
	getAllCommands,
	getAllOperations,
	getOperationsFlat,
} from "./operations";

export { conditionReferencesCurrentUser } from "./current-user-references";
export { conditionReferencesInput } from "./input-references";
export {
	extractInjectableParams,
	type InjectableParam,
} from "./injectable-params";

/**
 * Get all invariants from all contexts.
 * Returns entries with context and name for qualified references.
 */
export const getAllInvariants = (
	schema: DomainSchema,
): readonly QualifiedEntry<InvariantDef>[] =>
	Object.entries(schema.contexts).flatMap(([contextName, context]) =>
		context.invariants.map((invariant) => ({
			context: contextName,
			def: invariant,
			name: invariant.name,
		})),
	);

/**
 * Get invariants scoped to a specific entity.
 */
export const getEntityInvariants = (
	schema: DomainSchema,
	entityName: string,
): readonly InvariantDef[] =>
	getAllInvariants(schema)
		.filter(
			(entry) =>
				entry.def.scope.kind === "entity" &&
				entry.def.scope.entity === entityName,
		)
		.map((entry) => entry.def);

/**
 * Get invariants scoped to a specific operation (pre or post conditions).
 */
export const getOperationInvariants = (
	schema: DomainSchema,
	operationName: string,
	when: "post" | "pre",
): readonly InvariantDef[] =>
	getAllInvariants(schema)
		.filter(
			(entry) =>
				entry.def.scope.kind === "operation" &&
				entry.def.scope.operation === operationName &&
				entry.def.scope.when === when,
		)
		.map((entry) => entry.def);

/**
 * Get all invariants with context scope (authorization rules).
 */
export const getContextInvariants = (
	schema: DomainSchema,
): readonly QualifiedEntry<InvariantDef>[] =>
	getAllInvariants(schema).filter(
		(entry) => entry.def.scope.kind === "context",
	);

/**
 * Get an invariant by name.
 * Returns undefined if not found.
 */
export const getInvariantByName = (
	schema: DomainSchema,
	name: string,
): InvariantDef | undefined =>
	getAllInvariants(schema).find((entry) => entry.name === name)?.def;

/**
 * Get the pre-invariant names declared on an operation.
 * These are the invariant names from operation.pre array, not scope-based.
 */
export const getOperationPreInvariantNames = (
	schema: DomainSchema,
	operationName: string,
): readonly string[] => {
	const operations = getAllOperations(schema);
	const op = operations.find((entry) => entry.name === operationName);
	return op?.def.pre ?? [];
};

/**
 * Get the post-invariant names declared on a command.
 * Only commands can have post-invariants (queries don't modify state).
 * These are the invariant names from command.post array, not scope-based.
 */
export const getOperationPostInvariantNames = (
	schema: DomainSchema,
	operationName: string,
): readonly string[] => {
	const commands = getAllCommands(schema);
	const cmd = commands.find((entry) => entry.name === operationName);
	return cmd?.def.post ?? [];
};

/**
 * Get the full invariant definitions for an operation's pre-invariants.
 * Resolves names from operation.pre to InvariantDef objects.
 */
export const getOperationPreInvariantDefs = (
	schema: DomainSchema,
	operationName: string,
): readonly InvariantDef[] => {
	const names = getOperationPreInvariantNames(schema, operationName);
	return names
		.map((name) => getInvariantByName(schema, name))
		.filter((def): def is InvariantDef => def !== undefined);
};

/**
 * Get the full invariant definitions for an operation's post-invariants.
 * Resolves names from operation.post to InvariantDef objects.
 */
export const getOperationPostInvariantDefs = (
	schema: DomainSchema,
	operationName: string,
): readonly InvariantDef[] => {
	const names = getOperationPostInvariantNames(schema, operationName);
	return names
		.map((name) => getInvariantByName(schema, name))
		.filter((def): def is InvariantDef => def !== undefined);
};

/**
 * Check if any operation in the schema requires authentication.
 * Returns true if any operation has a pre-invariant that references context.currentUser.
 */
export const schemaHasAuthRequirement = (schema: DomainSchema): boolean => {
	const allOperations = getOperationsFlat(schema);

	for (const [operationName] of Object.entries(allOperations)) {
		const preInvariants = getOperationPreInvariantDefs(schema, operationName);
		const hasAuth = preInvariants.some((inv) =>
			conditionReferencesCurrentUser(inv.condition),
		);
		if (hasAuth) return true;
	}

	return false;
};

/**
 * Get injectable parameters for an operation by analyzing its invariants.
 * Extracts from pre-invariants that contain equality constraints on input/context.
 */
export const getInjectableParams = (
	schema: DomainSchema,
	operationName: string,
): readonly InjectableParam[] => {
	const preInvariants = getOperationPreInvariantDefs(schema, operationName);
	const params: InjectableParam[] = [];

	for (const inv of preInvariants) {
		const extracted = extractInjectableParams(inv.condition, inv.name);
		params.push(...extracted);
	}

	// Deduplicate by paramName (keep first occurrence)
	const seen = new Set<string>();
	return params.filter((p) => {
		if (seen.has(p.paramName)) return false;
		seen.add(p.paramName);
		return true;
	});
};
