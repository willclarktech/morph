/**
 * Request parameter extraction.
 *
 * Extracts operation parameters from HTTP requests based on method:
 * - Path params: Entity IDs from URL path
 * - GET/DELETE: Remaining params from query string
 * - POST/PATCH: Remaining params from JSON body
 *
 * Supports context injection for parameters constrained by invariants.
 */

import type { CodecRegistry } from "@morph/codec-dsl";
import type { InjectableParam } from "@morph/domain-schema";
import type { AnyOperation } from "@morph/operation";

import { getFieldNames } from "@morph/operation";
import { toCamelCase } from "@morph/utils";
import { Effect, Exit } from "effect";

export interface ExtractedParameters {
	readonly options: Record<string, unknown>;
	readonly params: Record<string, unknown>;
}

/**
 * Context for parameter injection.
 */
export interface InjectionContext {
	readonly codecRegistry?: CodecRegistry | undefined;
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
		// Could extend to support other currentUser fields
	}

	return undefined;
};

/**
 * Parse a query string value to the appropriate type.
 * Handles: booleans, numbers, and strings.
 */
const parseQueryValue = (value: string): unknown => {
	// Boolean
	if (value === "true") return true;
	if (value === "false") return false;

	// Number (only if it looks like a number)
	if (/^-?\d+(?:\.\d+)?$/.test(value)) {
		const number_ = Number(value);
		if (!Number.isNaN(number_)) return number_;
	}

	// String
	return value;
};

/**
 * Decode request body using Content-Type codec when available.
 * Falls back to JSON parsing when no codec registry is provided.
 */
const decodeRequestBody = async (
	request: Request,
	injectionContext?: InjectionContext,
): Promise<Record<string, unknown>> => {
	const registry = injectionContext?.codecRegistry;
	if (registry) {
		const contentType =
			request.headers.get("content-type") ?? "application/json";
		const codecResult = Effect.runSyncExit(
			registry.fromContentType(contentType),
		);
		if (Exit.isSuccess(codecResult)) {
			const codec = codecResult.value;
			const raw =
				codec.format === "protobuf"
					? new Uint8Array(await request.arrayBuffer())
					: await request.text();
			const decodeResult = await Effect.runPromiseExit(
				codec.decode(raw, "request"),
			);
			if (Exit.isSuccess(decodeResult)) {
				return decodeResult.value as Record<string, unknown>;
			}
		}
	}
	return (await request.json()) as Record<string, unknown>;
};

/**
 * Extract parameters from an HTTP request.
 *
 * @param request - The incoming HTTP request
 * @param operation - The operation being called
 * @param pathParams - Parameters extracted from URL path (e.g., { pasteId: "123" })
 * @param injectionContext - Optional context for auto-injecting params from auth
 */
export const extractParameters = async (
	request: Request,
	operation: AnyOperation,
	pathParameters: Record<string, string>,
	injectionContext?: InjectionContext,
): Promise<ExtractedParameters> => {
	const method = request.method;
	const url = new URL(request.url);

	const paramNames = getFieldNames(operation.params);
	const optionNames = getFieldNames(operation.options);

	const params: Record<string, unknown> = {};
	const options: Record<string, unknown> = {};

	// Path params always go to params
	for (const [key, value] of Object.entries(pathParameters)) {
		if (paramNames.includes(key)) {
			params[key] = value;
		}
	}

	if (method === "GET" || method === "DELETE") {
		// Query string for remaining params
		for (const name of paramNames) {
			if (params[name] === undefined) {
				// Try kebab-case and camelCase versions
				const kebabName = name
					.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
					.toLowerCase();
				const value =
					url.searchParams.get(name) ?? url.searchParams.get(kebabName);
				if (value !== null) {
					params[name] = parseQueryValue(value);
				}
			}
		}
		for (const name of optionNames) {
			const kebabName = name
				.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
				.toLowerCase();
			const value =
				url.searchParams.get(name) ?? url.searchParams.get(kebabName);
			if (value !== null) {
				options[name] = parseQueryValue(value);
			}
		}
	} else {
		// Request body for POST/PUT/PATCH
		let body: Record<string, unknown> = {};
		try {
			body = await decodeRequestBody(request, injectionContext);
		} catch {
			// Empty or invalid body - will be caught by validation later
		}

		for (const name of paramNames) {
			if (params[name] === undefined) {
				// Try both camelCase and kebab-case in body
				const kebabName = name
					.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
					.toLowerCase();
				const camelName = toCamelCase(kebabName);
				const value = body[name] ?? body[camelName] ?? body[kebabName];
				if (value !== undefined) {
					params[name] = value;
				}
			}
		}
		for (const name of optionNames) {
			const kebabName = name
				.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
				.toLowerCase();
			const camelName = toCamelCase(kebabName);
			const value = body[name] ?? body[camelName] ?? body[kebabName];
			if (value !== undefined) {
				options[name] = value;
			}
		}
	}

	// Inject missing params from context (invariant-based inference)
	if (injectionContext?.injectableParams) {
		for (const injectable of injectionContext.injectableParams) {
			if (params[injectable.paramName] === undefined) {
				const value = resolveContextPath(
					injectable.contextPath,
					injectionContext,
				);
				if (value !== undefined) {
					params[injectable.paramName] = value;
				}
			}
		}
	}

	return { options, params };
};
