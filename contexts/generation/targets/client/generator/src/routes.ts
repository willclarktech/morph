/**
 * Route inference for HTTP client.
 * Mirrors the server-side route inference in @morphdsl/api-core.
 */

import type { OperationDef } from "@morphdsl/domain-schema";

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

export interface RouteInfo {
	readonly method: HttpMethod;
	readonly path: string;
	readonly pathParams: readonly string[];
}

/**
 * Infer HTTP method from operation name using conventions.
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
 */
const extractResource = (operationName: string): string => {
	const withoutPrefix = operationName.replace(
		/^(?:get|find|list|fetch|create|add|register|update|modify|change|delete|remove)/i,
		"",
	);

	const resource = toKebabCase(withoutPrefix);
	if (resource.endsWith("s")) {
		return resource;
	}
	return `${resource}s`;
};

/**
 * Check if an operation is an action on a resource.
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
 * Get path parameters from operation input (params ending in 'Id').
 * Injectable params are excluded since they come from auth context, not the URL.
 */
export const getPathParameters = (
	operation: OperationDef,
	injectableParamNames: readonly string[] = [],
): readonly string[] => {
	const injectableSet = new Set(injectableParamNames);
	return Object.keys(operation.input).filter(
		(name) => name.endsWith("Id") && !injectableSet.has(name),
	);
};

/**
 * Build route path from operation.
 */
const buildPath = (
	operationName: string,
	operation: OperationDef,
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
 * Build route info for an operation.
 * Injectable params are excluded from path parameters since they come from auth context.
 */
export const buildRoute = (
	operationName: string,
	operation: OperationDef,
	basePath: string,
	injectableParamNames: readonly string[] = [],
	domainService?: DomainServiceContext,
): RouteInfo => {
	const method = inferMethod(operationName);
	const pathSegment = buildPath(
		operationName,
		operation,
		method,
		injectableParamNames,
		domainService,
	);
	const path = `${basePath}${pathSegment}`;

	// Only include params that are actually in the path
	const allIdParameters = getPathParameters(operation, injectableParamNames);
	const pathParameters = allIdParameters.filter((param) =>
		pathSegment.includes(`:${param}`),
	);

	return {
		method,
		path,
		pathParams: pathParameters,
	};
};
