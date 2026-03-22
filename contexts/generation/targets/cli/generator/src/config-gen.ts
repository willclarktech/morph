/**
 * CLI configuration code generation (injectable params, domain services).
 */

import type { DomainSchema, InjectableParam } from "@morph/domain-schema";

import {
	getAllOperations,
	getInjectableParams,
	getOperationAggregates,
	isDomainService,
} from "@morph/domain-schema";
import { indent } from "@morph/utils";

/**
 * Helper to convert context path to JS expression.
 */
const contextPathToExpr = (path: string): string => {
	// "currentUser.id" -> "user.id"
	// "currentUser.email" -> "user.email"
	if (path.startsWith("currentUser.")) {
		return `user.${path.slice("currentUser.".length)}`;
	}
	return `user.${path}`;
};

/**
 * Detect operations with injectable params.
 */
export const getOperationsWithInjectable = (
	schema: DomainSchema,
): readonly {
	injectables: readonly InjectableParam[];
	name: string;
}[] =>
	getAllOperations(schema)
		.filter((op) => getInjectableParams(schema, op.name).length > 0)
		.map((op) => ({
			name: op.name,
			injectables: getInjectableParams(schema, op.name),
		}));

/**
 * Generate wrapper code for operations with injectable params.
 */
export const generateOperationWrapperCode = (
	operationsWithInjectable: readonly {
		injectables: readonly InjectableParam[];
		name: string;
	}[],
): string => {
	const wrapperEntries = operationsWithInjectable
		.map((op) => {
			const mergeExpr = op.injectables
				.map((p) => `${p.paramName}: ${contextPathToExpr(p.contextPath)}`)
				.join(", ");
			const entry = `${op.name}: {
	...ops.${op.name},
	execute: (params: unknown, options: unknown) =>
		Effect.gen(function* () {
			const authService = yield* AuthService;
			const user = (yield* authService.requireAuth()) as { readonly id: unknown };
			const mergedParams = { ...(params as Record<string, unknown>), ${mergeExpr} };
			// Validate merged params against operation schema
			const validatedParams = yield* S.decodeUnknown(ops.${op.name}.params)(mergedParams);
			/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- CLI wrapper bridges untyped args to typed operations */
			return yield* ops.${op.name}.execute(validatedParams as any, options as any);
			/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
		}),
},`;
			return indent(entry, 2);
		})
		.join("\n");

	return `
	// Wrap operations that need auth-derived params injected
	const wrappedOps = {
		...ops,
${wrapperEntries}
	};`;
};

/**
 * Build injectable params config for createCli.
 */
export const buildInjectableParamsConfig = (
	operationsWithInjectable: readonly {
		injectables: readonly InjectableParam[];
		name: string;
	}[],
): string => {
	const entries = operationsWithInjectable
		.map(
			(op) =>
				`${op.name}: [${op.injectables.map((p) => `"${p.paramName}"`).join(", ")}],`,
		)
		.join("\n");
	return `{
${indent(entries, 3)}
		}`;
};

/**
 * Get domain service operations with their aggregate scope.
 */
export const getDomainServiceOps = (
	schema: DomainSchema,
): readonly { name: string; scope: string }[] =>
	getAllOperations(schema)
		.filter((op) => isDomainService(schema, op.name))
		.map((op) => {
			const aggregates = getOperationAggregates(schema, op.name);
			const scope = aggregates
				.map((a) => `${a.aggregate} (${a.access})`)
				.join(", ");
			return { name: op.name, scope };
		});

/**
 * Build aggregate scope config for createCli.
 */
export const buildAggregateScopeConfig = (
	domainServiceOps: readonly { name: string; scope: string }[],
): string => {
	const entries = domainServiceOps
		.map((op) => `${op.name}: "${op.scope}",`)
		.join("\n");
	return `{
${indent(entries, 3)}
		}`;
};
