import type { AnyOperation } from "@morph/operation";
/**
 * HTTP Request Building
 *
 * Constructs HTTP requests from operation names and parameters,
 * using the same route conventions as the generated API.
 */
import type {
	DomainServiceContext,
	HttpMethod,
	RouteDefinition,
} from "@morph/runtime-api";

import { buildRoute } from "@morph/runtime-api";

export type { DomainServiceContext } from "@morph/runtime-api";

/**
 * Build an HTTP request for an operation.
 */
export const buildRequest = (
	operation: AnyOperation,
	params: Record<string, unknown>,
	baseUrl: string,
	basePath: string,
	authToken?: string,
	domainService?: DomainServiceContext,
): Request => {
	// Test runner doesn't know about injectable params - those are handled server-side
	const route = buildRoute(operation, basePath, [], domainService);
	const url = buildUrl(route, params, baseUrl);
	const { body, headers } = buildRequestOptions(
		route.method,
		params,
		route.pathParams,
		authToken,
	);

	return new Request(url, {
		body,
		headers,
		method: route.method,
	});
};

/**
 * Convert a value to a string for URL encoding.
 */
const stringifyValue = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
};

/**
 * Build the full URL with path parameters substituted and query string for GET.
 */
const buildUrl = (
	route: RouteDefinition,
	params: Record<string, unknown>,
	baseUrl: string,
): string => {
	let path = route.path;

	// Substitute path parameters
	for (const pathParam of route.pathParams) {
		const value = params[pathParam];
		if (value !== undefined) {
			path = path.replace(
				`:${pathParam}`,
				encodeURIComponent(stringifyValue(value)),
			);
		}
	}

	// For GET requests, non-path params go to query string
	if (route.method === "GET") {
		const queryParameters = Object.entries(params)
			.filter(([key]) => !route.pathParams.includes(key))
			.filter(([, value]) => value !== undefined);

		if (queryParameters.length > 0) {
			const searchParameters = new URLSearchParams();
			for (const [key, value] of queryParameters) {
				searchParameters.set(key, stringifyValue(value));
			}
			path = `${path}?${searchParameters.toString()}`;
		}
	}

	return `${baseUrl}${path}`;
};

/**
 * Build request body and headers based on HTTP method.
 */
const buildRequestOptions = (
	method: HttpMethod,
	params: Record<string, unknown>,
	pathParameters: readonly string[],
	authToken?: string,
): { body: string | undefined; headers: Record<string, string> } => {
	const headers: Record<string, string> = {};

	if (authToken) {
		headers["Authorization"] = `Bearer ${authToken}`;
	}

	// GET requests don't have a body
	if (method === "GET") {
		return { body: undefined, headers };
	}

	// For other methods, non-path params go to body
	const bodyParameters = Object.fromEntries(
		Object.entries(params).filter(([key]) => !pathParameters.includes(key)),
	);

	headers["Content-Type"] = "application/json";

	return {
		body: JSON.stringify(bodyParameters),
		headers,
	};
};
