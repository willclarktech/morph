import type {
	OperationDef,
	QualifiedEntry,
	TypeRef,
} from "@morph/domain-schema";

import { contextNameToKebab } from "@morph/domain-schema";

/**
 * Collect all entity/value object types needed for imports, grouped by context.
 */
export const collectTypeImports = (
	operations: readonly QualifiedEntry<OperationDef>[],
): Map<string, Set<string>> => {
	const typesByContext = new Map<string, Set<string>>();

	for (const entry of operations) {
		const op = entry.def;
		const defaultContext = entry.context;

		// Input types
		for (const param of Object.values(op.input)) {
			collectTypesFromRef(param.type, typesByContext, defaultContext);
		}

		// Output type
		collectTypesFromRef(op.output, typesByContext, defaultContext);
	}

	return typesByContext;
};

/**
 * Collect error types for imports, grouped by context.
 */
export const collectErrorImports = (
	operations: readonly QualifiedEntry<OperationDef>[],
): Map<string, Set<string>> => {
	const errorsByContext = new Map<string, Set<string>>();

	for (const entry of operations) {
		const context = entry.context;
		for (const error of entry.def.errors) {
			const existing = errorsByContext.get(context) ?? new Set<string>();
			errorsByContext.set(context, existing);
			existing.add(`${error.name}Error`);
		}
	}

	return errorsByContext;
};

/**
 * Get or create a set for a context in the types map.
 */
const getOrCreateContextSet = (
	typesByContext: Map<string, Set<string>>,
	context: string,
): Set<string> => {
	const existing = typesByContext.get(context);
	if (existing) return existing;
	const created = new Set<string>();
	typesByContext.set(context, created);
	return created;
};

/**
 * Recursively collect types from a type reference, tracking context.
 */
const collectTypesFromRef = (
	ref: TypeRef,
	typesByContext: Map<string, Set<string>>,
	defaultContext: string,
): void => {
	switch (ref.kind) {
		case "array": {
			collectTypesFromRef(ref.element, typesByContext, defaultContext);
			break;
		}
		case "entity": {
			const context = ref.context ?? defaultContext;
			const types = getOrCreateContextSet(typesByContext, context);
			types.add(ref.name);
			break;
		}
		case "entityId": {
			const context = ref.context ?? defaultContext;
			const types = getOrCreateContextSet(typesByContext, context);
			types.add(`${ref.entity}Id`);
			break;
		}
		case "function":
		case "primitive":
		case "typeParam":
		case "union": {
			// No import needed
			break;
		}
		case "generic": {
			const context = ref.context ?? defaultContext;
			const types = getOrCreateContextSet(typesByContext, context);
			types.add(ref.name);
			for (const argument of ref.args) {
				collectTypesFromRef(argument, typesByContext, defaultContext);
			}
			break;
		}
		case "optional": {
			collectTypesFromRef(ref.inner, typesByContext, defaultContext);
			break;
		}
		case "type": {
			const context = ref.context ?? defaultContext;
			const types = getOrCreateContextSet(typesByContext, context);
			types.add(ref.name);
			break;
		}
		case "valueObject": {
			const context = ref.context ?? defaultContext;
			const types = getOrCreateContextSet(typesByContext, context);
			types.add(ref.name);
			break;
		}
	}
};

/**
 * Generate type imports from multiple context DSL packages.
 */
export const generateMultiContextTypeImports = (
	scope: string,
	typesByContext: Map<string, Set<string>>,
	errorsByContext: Map<string, Set<string>>,
): string => {
	// Merge types and errors by context
	const allContexts = new Set([
		...errorsByContext.keys(),
		...typesByContext.keys(),
	]);

	if (allContexts.size === 0) return "";

	const imports: string[] = [];

	for (const context of [...allContexts].sort()) {
		const types = typesByContext.get(context) ?? new Set();
		const errors = errorsByContext.get(context) ?? new Set();
		const allImports = [...types, ...errors].sort();

		if (allImports.length > 0) {
			const contextKebab = contextNameToKebab(context);
			const dslPackage = `@${scope}/${contextKebab}-dsl`;
			imports.push(
				`import type { ${allImports.join(", ")} } from "${dslPackage}";`,
			);
		}
	}

	return imports.join("\n");
};
