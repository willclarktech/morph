import type { CodecRegistry } from "@morphdsl/codec-dsl";
/**
 * Route building from domain operations.
 */
import type { DomainSchema, InjectableParam } from "@morphdsl/domain-schema";
import type { AnyOperation } from "@morphdsl/operation";
import type { Context, ManagedRuntime } from "effect";

import {
	getDomainServiceAction,
	getPrimaryWriteAggregate,
	isDomainService,
} from "@morphdsl/domain-schema";

import type { AuthStrategy } from "./auth";
import type { RouteHandler } from "./handler";
import type { DomainServiceContext, RouteDefinition } from "./router";

import { createHandlerWithRuntime } from "./handler";
import { buildRoute } from "./router";

/**
 * Build route handlers for a single operation.
 */
export const buildOperationRoute = <R>(
	operation: AnyOperation,
	basePath: string,
	injectableParams: readonly InjectableParam[],
	domainSchema: DomainSchema | undefined,
	runtime: ManagedRuntime.ManagedRuntime<R, never>,
	auth: AuthStrategy | undefined,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any AuthService-compatible tag
	authServiceTag?: Context.Tag<any, any>,
	codecRegistry?: CodecRegistry,
): { handler: RouteHandler; route: RouteDefinition } => {
	const injectableParamNames = injectableParams.map((p) => p.paramName);

	// Check if this operation is a domain service (uses multiple aggregates)
	let domainServiceContext: DomainServiceContext | undefined;
	if (domainSchema && isDomainService(domainSchema, operation.name)) {
		const primaryAggregate = getPrimaryWriteAggregate(
			domainSchema,
			operation.name,
		);
		if (primaryAggregate) {
			domainServiceContext = {
				action: getDomainServiceAction(operation.name, primaryAggregate),
				primaryAggregate,
			};
		}
	}

	const route = buildRoute(
		operation,
		basePath,
		injectableParamNames,
		domainServiceContext,
	);
	const handler = createHandlerWithRuntime(
		operation,
		runtime,
		auth,
		injectableParams,
		authServiceTag,
		codecRegistry,
	);

	return { handler, route };
};

/**
 * Build all route handlers from a module of operations.
 */
export const buildRouteHandlers = <R>(
	operations: readonly AnyOperation[],
	basePath: string,
	injectableParams: Readonly<Record<string, readonly InjectableParam[]>>,
	domainSchema: DomainSchema | undefined,
	runtime: ManagedRuntime.ManagedRuntime<R, never>,
	auth: AuthStrategy | undefined,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any AuthService-compatible tag
	authServiceTag?: Context.Tag<any, any>,
	codecRegistry?: CodecRegistry,
): Map<string, Map<string, RouteHandler>> => {
	const handlers = new Map<string, Map<string, RouteHandler>>();

	for (const operation of operations) {
		const opInjectableParams = injectableParams[operation.name] ?? [];
		const { route, handler } = buildOperationRoute(
			operation,
			basePath,
			opInjectableParams,
			domainSchema,
			runtime,
			auth,
			authServiceTag,
			codecRegistry,
		);

		let methodMap = handlers.get(route.path);
		if (!methodMap) {
			methodMap = new Map();
			handlers.set(route.path, methodMap);
		}
		methodMap.set(route.method, handler);
	}

	return handlers;
};
