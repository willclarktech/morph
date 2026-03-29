import type { DomainSchema, OperationDef } from "@morphdsl/domain-schema";

import {
	getDomainServiceAction,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";

/**
 * Determine HTTP method and path for an operation.
 * Injectable params are excluded from path since they come from auth context.
 */
export const operationToRoute = (
	schema: DomainSchema,
	name: string,
	def: OperationDef,
	basePath: string,
	injectableNames: Set<string> = new Set(),
): { method: "delete" | "get" | "post" | "put"; path: string } => {
	// Check if this is a domain service
	if (isDomainService(schema, name)) {
		const primaryAggregate = getPrimaryWriteAggregate(schema, name);
		if (primaryAggregate) {
			const action = getDomainServiceAction(name, primaryAggregate);
			const resourcePath = `${basePath}/${pluralize(primaryAggregate.toLowerCase())}`;
			return { method: "post", path: `${resourcePath}/${action}` };
		}
	}

	// Infer resource and action from operation name
	const { action, resource } = parseOperationName(name);

	// Build path
	const resourcePath = `${basePath}/${pluralize(resource.toLowerCase())}`;

	// Determine method and path based on action
	switch (action) {
		case "complete":
		case "update": {
			const idParam = findIdParam(def, resource, injectableNames);
			// If no ID param found (all injectable), use collection endpoint
			return idParam
				? { method: "put", path: `${resourcePath}/{${idParam}}` }
				: { method: "put", path: resourcePath };
		}
		case "create": {
			return { method: "post", path: resourcePath };
		}
		case "delete": {
			const idParam = findIdParam(def, resource, injectableNames);
			return idParam
				? { method: "delete", path: `${resourcePath}/{${idParam}}` }
				: { method: "delete", path: resourcePath };
		}
		case "get": {
			const idParam = findIdParam(def, resource, injectableNames);
			return idParam
				? { method: "get", path: `${resourcePath}/{${idParam}}` }
				: { method: "get", path: resourcePath };
		}
		case "list": {
			return { method: "get", path: resourcePath };
		}
		default: {
			// Default to POST for unknown actions
			return { method: "post", path: `${resourcePath}/${action}` };
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
