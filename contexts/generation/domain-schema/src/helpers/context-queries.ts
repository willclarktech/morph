import type { ContextDef, DomainSchema } from "../schemas";

import { getAllInvariants } from "./invariants";

export const getContextOperationsWithTag = (
	context: ContextDef,
	tag: string,
): readonly string[] => {
	const ops = [
		...Object.entries(context.commands ?? {}),
		...Object.entries(context.queries ?? {}),
		...Object.entries(context.functions ?? {}),
	];
	return ops.filter(([_, op]) => op.tags.includes(tag)).map(([name]) => name);
};

export const getContextsWithTag = (
	schema: DomainSchema,
	tag: string,
): readonly string[] =>
	Object.entries(schema.contexts)
		.filter(
			([_, context]) => getContextOperationsWithTag(context, tag).length > 0,
		)
		.map(([name]) => name);

export const findPrimaryContext = (
	schema: DomainSchema,
): string | undefined => {
	const contextNames = Object.keys(schema.contexts);
	return (
		contextNames.find((contextName) => {
			const context = schema.contexts[contextName];
			return (
				context &&
				(Object.keys(context.commands ?? {}).length > 0 ||
					Object.keys(context.queries ?? {}).length > 0 ||
					Object.keys(context.functions ?? {}).length > 0)
			);
		}) ?? contextNames[0]
	);
};

export const hasPropertyTests = (schema: DomainSchema): boolean =>
	getAllInvariants(schema).some(
		(entry) =>
			entry.def.scope.kind === "entity" || entry.def.scope.kind === "context",
	);
