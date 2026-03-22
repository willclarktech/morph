/**
 * Type traversal and collection utilities for DSL generation.
 */
import type { ContextDef, ParamDef, TypeRef } from "@morph/domain-schema";

/**
 * Minimal definition type for DSL generation.
 * Both OperationDef and FunctionDef satisfy this interface.
 */
export interface GeneratableDef {
	readonly input: Record<string, ParamDef>;
	readonly output: TypeRef;
}

/**
 * Get operations (commands and queries) from a context.
 * Operations need handlers and get wrapped with defineOp.
 */
export const getContextOperations = (
	context: ContextDef,
): Record<string, GeneratableDef> => ({
	...context.commands,
	...context.queries,
});

/**
 * Get functions from a context.
 * Functions are pure and don't need defineOp wrappers.
 */
const getContextFunctions = (
	context: ContextDef,
): Record<string, GeneratableDef> => ({
	...context.functions,
});

/**
 * Collect all type names that need to be imported for a context.
 */
export const collectTypeImports = (context: ContextDef): string[] => {
	const types = new Set<string>();

	const collectFromDefs = (defs: Record<string, GeneratableDef>) => {
		for (const def of Object.values(defs)) {
			for (const parameter of Object.values(def.input)) {
				collectTypesFromRef(parameter.type, types);
			}
			collectTypesFromRef(def.output, types);
		}
	};

	collectFromDefs(getContextOperations(context));
	collectFromDefs(getContextFunctions(context));

	return [...types].sort();
};

/**
 * Recursively collect type names from a TypeRef.
 */
export const collectTypesFromRef = (
	reference: TypeRef,
	types: Set<string>,
): void => {
	switch (reference.kind) {
		case "array": {
			collectTypesFromRef(reference.element, types);
			break;
		}
		case "entity": {
			types.add(reference.name);
			break;
		}
		case "entityId": {
			types.add(`${reference.entity}Id`);
			break;
		}
		case "generic": {
			// Collect the generic type name and recurse into args
			types.add(reference.name);
			for (const argument of reference.args) {
				collectTypesFromRef(argument, types);
			}
			break;
		}
		case "optional": {
			collectTypesFromRef(reference.inner, types);
			break;
		}
		case "primitive":
		case "typeParam":
		case "union": {
			// Primitives, type parameters, and unions don't add imports
			break;
		}
		case "type": {
			types.add(reference.name);
			break;
		}
		case "valueObject": {
			types.add(reference.name);
			break;
		}
	}
};
