/**
 * Route inference from operation names.
 *
 * Maps domain operations to RESTful HTTP routes using conventions:
 * - Operation name prefix → HTTP method
 * - Operation name suffix → Resource path
 *
 * Domain services (multi-aggregate operations) route under their primary
 * write aggregate with an action suffix:
 * - transferTodos → POST /todos/transfer
 */

import type { AnyOperation } from "@morphdsl/operation";

import { getFieldNames } from "@morphdsl/operation";
import { toKebabCase } from "@morphdsl/utils";

export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

/**
 * Domain service routing context.
 * When provided, the operation routes under the primary aggregate.
 */
export interface DomainServiceContext {
	/** The action name for the route (e.g., "transfer" for transferTodos) */
	readonly action: string;
	/** The primary write aggregate (e.g., "Todo") */
	readonly primaryAggregate: string;
}

export interface RouteDefinition {
	readonly method: HttpMethod;
	readonly operation: AnyOperation;
	readonly path: string;
	readonly pathParams: readonly string[];
}

/**
 * Infer HTTP method from operation name using conventions.
 *
 * | Prefix | Method |
 * |--------|--------|
 * | create*, add*, register* | POST |
 * | get*, find*, list*, fetch* | GET |
 * | update*, modify*, change* | PATCH |
 * | delete*, remove* | DELETE |
 * | Other | POST (safe default for mutations) |
 */
export const inferMethod = (operationName: string): HttpMethod => {
	const name = operationName.toLowerCase();

	if (/^(?:get|find|list|fetch)/.test(name)) return "GET";
	if (/^(?:create|add|register)/.test(name)) return "POST";
	if (/^(?:update|modify|change)/.test(name)) return "PATCH";
	if (/^(?:delete|remove)/.test(name)) return "DELETE";

	// Default to POST for mutations
	return "POST";
};

/**
 * Extract resource name from operation name.
 * e.g., createPaste → pastes, getPaste → pastes, listPastes → pastes
 */
const extractResource = (operationName: string): string => {
	// Remove verb prefixes
	const withoutPrefix = operationName.replace(
		/^(?:get|find|list|fetch|create|add|register|update|modify|change|delete|remove)/i,
		"",
	);

	// Handle pluralization
	// If already plural (ends in 's'), use as-is
	// Otherwise, add 's'
	const resource = toKebabCase(withoutPrefix);
	if (resource.endsWith("s")) {
		return resource;
	}
	return `${resource}s`;
};

/**
 * Check if an operation is an action on a resource (vs CRUD).
 * e.g., completeTodo, activateUser, approveRequest
 */
const isResourceAction = (operationName: string): boolean => {
	const actionPrefixes = [
		"complete",
		"activate",
		"deactivate",
		"approve",
		"reject",
		"cancel",
		"archive",
		"restore",
		"publish",
		"unpublish",
	];
	const name = operationName.toLowerCase();
	return actionPrefixes.some((prefix) => name.startsWith(prefix));
};

/**
 * Get entity ID parameters from an operation (params ending in 'Id' with entityId type).
 * Injectable params are excluded since they come from auth context, not the URL.
 */
export const getPathParameters = (
	operation: AnyOperation,
	injectableParamNames: readonly string[] = [],
): readonly string[] => {
	const paramNames = getFieldNames(operation.params);
	const injectableSet = new Set(injectableParamNames);
	// Entity IDs are params ending in 'Id', excluding injectable params
	return paramNames.filter(
		(name) => name.endsWith("Id") && !injectableSet.has(name),
	);
};

/**
 * Build route path from operation.
 *
 * Examples:
 * - createPaste → POST /pastes
 * - getPaste(pasteId) → GET /pastes/:pasteId
 * - listPastes → GET /pastes
 * - deletePaste(pasteId) → DELETE /pastes/:pasteId
 * - completeTodo(todoId) → POST /todos/:todoId/complete
 * - transferTodos (domain service) → POST /todos/transfer
 */
export const buildPath = (
	operationName: string,
	operation: AnyOperation,
	method: HttpMethod,
	injectableParamNames: readonly string[] = [],
	domainService?: DomainServiceContext,
): string => {
	// Domain service routing: /{aggregate}s/{action}
	if (domainService) {
		const aggregateResource = toKebabCase(domainService.primaryAggregate) + "s";
		return `/${aggregateResource}/${domainService.action}`;
	}

	const resource = extractResource(operationName);
	const pathParameters = getPathParameters(operation, injectableParamNames);

	// Check if this is an action on a resource
	if (isResourceAction(operationName) && pathParameters.length === 1) {
		const paramName = pathParameters[0];
		// Extract action name (e.g., completeTodo → complete)
		const actionMatch =
			/^(complete|activate|deactivate|approve|reject|cancel|archive|restore|publish|unpublish)/i.exec(
				operationName,
			);
		if (actionMatch?.[1] && paramName) {
			const action = toKebabCase(actionMatch[1]);
			return `/${resource}/:${paramName}/${action}`;
		}
	}

	// List endpoint: GET /resources
	if (method === "GET" && operationName.toLowerCase().startsWith("list")) {
		return `/${resource}`;
	}

	// Single resource with ID: GET/PATCH/DELETE /resources/:id
	if (pathParameters.length === 1 && pathParameters[0]) {
		return `/${resource}/:${pathParameters[0]}`;
	}

	// Collection endpoint (no ID): POST /resources
	return `/${resource}`;
};

/**
 * Build a route definition from an operation.
 * Injectable params are excluded from path parameters since they come from auth context.
 *
 * @param operation - The operation to build a route for
 * @param basePath - Base path prefix (e.g., "/api")
 * @param injectableParamNames - Params to exclude from path (injected from auth context)
 * @param domainService - Optional domain service context for multi-aggregate operations
 */
export const buildRoute = (
	operation: AnyOperation,
	basePath: string,
	injectableParamNames: readonly string[] = [],
	domainService?: DomainServiceContext,
): RouteDefinition => {
	const method = inferMethod(operation.name);
	const pathSegment = buildPath(
		operation.name,
		operation,
		method,
		injectableParamNames,
		domainService,
	);
	const path = `${basePath}${pathSegment}`;

	// Only include params that are actually in the path (have :paramName)
	// This handles cases like listTodos where userId is a filter, not a path param
	// Domain services typically don't have path parameters (they use body params)
	const allIdParameters = getPathParameters(operation, injectableParamNames);
	const pathParameters = allIdParameters.filter((param) =>
		pathSegment.includes(`:${param}`),
	);

	return {
		method,
		operation,
		path,
		pathParams: pathParameters,
	};
};
