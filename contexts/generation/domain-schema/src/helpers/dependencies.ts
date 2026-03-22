/**
 * Cross-context dependency resolution helpers.
 */

import type { DomainSchema } from "../schemas";

/**
 * Get direct context dependencies (as declared in schema).
 */
export const getContextDependencies = (
	schema: DomainSchema,
	contextName: string,
): readonly string[] => {
	const context = schema.contexts[contextName];
	return context?.dependencies ?? [];
};

/**
 * Get transitive closure of dependencies for a context.
 * Returns all contexts that this context depends on (directly or transitively).
 */
export const getTransitiveDependencies = (
	schema: DomainSchema,
	contextName: string,
	visited: Set<string> = new Set(),
): readonly string[] => {
	if (visited.has(contextName)) {
		return [];
	}
	visited.add(contextName);

	const direct = getContextDependencies(schema, contextName);
	const transitive: string[] = [...direct];

	for (const dep of direct) {
		const nested = getTransitiveDependencies(schema, dep, visited);
		for (const n of nested) {
			if (!transitive.includes(n)) {
				transitive.push(n);
			}
		}
	}

	return transitive;
};

/**
 * Result of dependency analysis for imports.
 */
export interface DependencyImports {
	/** Map of context name to array of error type names to import */
	readonly errors: Readonly<Record<string, readonly string[]>>;
	/** Map of context name to array of type names to import */
	readonly types: Readonly<Record<string, readonly string[]>>;
}

/**
 * Analyze what needs to be imported from dependency contexts.
 * This examines the context's operations, functions, and types to determine
 * what references exist to types/errors in dependency contexts.
 */
export const getDependencyImports = (
	schema: DomainSchema,
	contextName: string,
): DependencyImports => {
	const deps = getContextDependencies(schema, contextName);
	const context = schema.contexts[contextName];

	if (!context) {
		return { errors: {}, types: {} };
	}

	// Build sets of what exists in each dependency context
	const depErrors: Record<string, Set<string>> = {};
	const depTypes: Record<string, Set<string>> = {};

	for (const depName of deps) {
		const depContext = schema.contexts[depName];
		if (!depContext) continue;

		depErrors[depName] = new Set(Object.keys(depContext.errors ?? {}));
		depTypes[depName] = new Set(Object.keys(depContext.types ?? {}));
	}

	// Track what we need to import
	const neededErrors: Record<string, Set<string>> = {};
	const neededTypes: Record<string, Set<string>> = {};

	// Check ports for error references
	for (const [, portDef] of Object.entries(context.ports ?? {})) {
		for (const [, methodDef] of Object.entries(portDef.methods)) {
			for (const errorName of methodDef.errors) {
				for (const depName of deps) {
					if (depErrors[depName]?.has(errorName)) {
						neededErrors[depName] ??= new Set();
						neededErrors[depName].add(errorName);
					}
				}
			}
		}
	}

	// Convert sets to readonly arrays
	const errors: Record<string, readonly string[]> = {};
	const types: Record<string, readonly string[]> = {};

	for (const [depName, errorSet] of Object.entries(neededErrors)) {
		errors[depName] = [...errorSet].sort();
	}
	for (const [depName, typeSet] of Object.entries(neededTypes)) {
		types[depName] = [...typeSet].sort();
	}

	return { errors, types };
};

/**
 * Convert a camelCase context name to kebab-case for package naming.
 * e.g., "authPassword" -> "auth-password"
 */
export const contextNameToKebab = (contextName: string): string =>
	contextName.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
