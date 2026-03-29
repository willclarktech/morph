/**
 * MCP Parameter Injection
 *
 * Injects missing parameters from authentication context based on
 * invariant-derived injectable params.
 */
import type { InjectableParam } from "@morphdsl/domain-schema";

/**
 * Context for parameter injection.
 */
export interface InjectionContext {
	readonly currentUser?: { readonly id: string } | undefined;
	readonly injectableParams?: readonly InjectableParam[] | undefined;
}

/**
 * Resolve a context path to a value.
 * Supports paths like "currentUser.id".
 */
const resolveContextPath = (
	path: string,
	context: InjectionContext,
): unknown => {
	const parts = path.split(".");

	if (parts[0] === "currentUser") {
		if (!context.currentUser) return undefined;
		if (parts[1] === "id") return context.currentUser.id;
	}

	return undefined;
};

/**
 * Inject missing parameters from auth context.
 *
 * For each injectable param that is undefined in the args,
 * resolves the value from the auth context and injects it.
 *
 * @param args The original arguments from MCP tool call
 * @param context The injection context with currentUser and injectableParams
 * @returns Augmented args with injected values
 */
export const injectParameters = (
	args: Record<string, unknown>,
	context: InjectionContext,
): Record<string, unknown> => {
	const injectableParameters = context.injectableParams ?? [];
	if (injectableParameters.length === 0) return args;

	const result = { ...args };

	for (const injectable of injectableParameters) {
		// Only inject if param is missing
		if (result[injectable.paramName] === undefined) {
			const value = resolveContextPath(injectable.contextPath, context);
			if (value !== undefined) {
				result[injectable.paramName] = value;
			}
		}
	}

	return result;
};
