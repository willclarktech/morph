import type {
	DomainSchema,
	OperationDef,
	OperationKind,
} from "@morphdsl/domain-schema";

import {
	getDomainServiceAction,
	getOperationKind,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";

/**
 * Determine HTTP method and path for an operation.
 *
 * Method is driven purely by operation kind (query → GET, command → POST);
 * see `targets/api/generator/src/router.ts` for the rationale behind the
 * deliberate REST simplification.
 *
 * Path is currently still inferred from the operation *name*, which is a
 * pre-existing heuristic the openapi generator inherited and which produces
 * occasionally awkward routes (e.g. `findByCity` → `/by-cities/find`). A
 * cleaner aggregate-driven path policy is desirable follow-up work.
 *
 * Injectable params are excluded from path since they come from auth context.
 */
export const operationToRoute = (
	schema: DomainSchema,
	name: string,
	def: OperationDef,
	basePath: string,
	injectableNames: Set<string> = new Set(),
): { method: "get" | "post"; path: string } => {
	const kind: OperationKind = getOperationKind(schema, name) ?? "command";
	const method: "get" | "post" = kind === "query" ? "get" : "post";

	// Check if this is a domain service
	if (isDomainService(schema, name)) {
		const primaryAggregate = getPrimaryWriteAggregate(schema, name);
		if (primaryAggregate) {
			const action = getDomainServiceAction(name, primaryAggregate);
			const resourcePath = `${basePath}/${pluralize(primaryAggregate.toLowerCase())}`;
			return { method, path: `${resourcePath}/${action}` };
		}
	}

	// Infer resource and action from operation name (path-only heuristic)
	const { action, resource } = parseOperationName(name);
	const resourcePath = `${basePath}/${pluralize(resource.toLowerCase())}`;

	switch (action) {
		case "complete":
		case "update":
		case "delete":
		case "get": {
			const idParam = findIdParam(def, resource, injectableNames);
			return idParam
				? { method, path: `${resourcePath}/{${idParam}}` }
				: { method, path: resourcePath };
		}
		case "create":
		case "list": {
			return { method, path: resourcePath };
		}
		default: {
			return { method, path: `${resourcePath}/${action}` };
		}
	}
};

/**
 * Parse operation name into action and resource.
 * e.g., "createTodo" -> { action: "create", resource: "Todo" }
 */
export const parseOperationName = (
	name: string,
): { action: string; resource: string } => {
	const match = /^([a-z]+)([A-Z][a-zA-Z]*)$/.exec(name);
	if (match?.[1] && match[2]) {
		return { action: match[1], resource: match[2] };
	}
	return { action: name, resource: "resource" };
};

/**
 * Find the ID parameter in operation input.
 * Injectable params are excluded since they come from auth context.
 */
const findIdParam = (
	def: OperationDef,
	resource: string,
	injectableNames: Set<string> = new Set(),
): string | undefined => {
	// Look for entityId parameter matching the resource (excluding injectable)
	for (const [paramName, paramDef] of Object.entries(def.input)) {
		if (
			paramDef.type.kind === "entityId" &&
			paramDef.type.entity.toLowerCase() === resource.toLowerCase() &&
			!injectableNames.has(paramName)
		) {
			return paramName;
		}
	}
	// Fallback to first non-injectable entityId
	for (const [paramName, paramDef] of Object.entries(def.input)) {
		if (paramDef.type.kind === "entityId" && !injectableNames.has(paramName)) {
			return paramName;
		}
	}
	return undefined;
};

/**
 * Simple pluralization.
 */
export const pluralize = (word: string): string => {
	if (word.endsWith("s")) return word;
	if (word.endsWith("y")) return word.slice(0, -1) + "ies";
	return word + "s";
};

/**
 * Convert camelCase/PascalCase to kebab-case.
 */
export const toKebabCase = (string_: string): string =>
	string_.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
