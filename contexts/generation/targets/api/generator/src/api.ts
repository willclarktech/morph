import type { CodecRegistry } from "@morph/codec-dsl";
/**
 * API server creation and runtime handler management.
 */
import type { DomainSchema, InjectableParam } from "@morph/domain-schema";
import type { Context } from "effect";
import type { Layer } from "effect/Layer";

import { isOperation } from "@morph/operation";
import { Data, Effect, ManagedRuntime } from "effect";

import type { AuthStrategy } from "./auth";
import type { RouteHandler } from "./handler";
import type { SseConfig, SseManager } from "./sse";

import { addHealthRoute, addOpenApiRoutes } from "./builtin-routes";
import { buildRouteHandlers } from "./route-builder";
import { createSseManager } from "./sse";
import { addSseRoute } from "./sse-routes";

// Re-export RouteHandler type
export type { RouteHandler } from "./handler";

export class StartupError extends Data.TaggedError("StartupError")<{
	readonly cause?: unknown;
	readonly message: string;
	readonly port: number;
}> {}

/**
 * Configuration for the API server.
 */
export interface ApiConfig<R = unknown> {
	/** Authentication strategy for extracting user from requests */
	readonly auth?: AuthStrategy;
	/** AuthService context tag from generated code (to match handler requirements) */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accepts any AuthService-compatible tag
	readonly authServiceTag?: Context.Tag<any, any>;
	/** API base path prefix (default: "/api") */
	readonly basePath?: string;
	/** Codec registry for multi-format content negotiation */
	readonly codecRegistry?: CodecRegistry;
	/** Enable CORS (default: true) */
	readonly cors?: boolean;
	/** Custom routes to add (e.g., /auth/login) */
	readonly customRoutes?: ReadonlyMap<
		string,
		ReadonlyMap<string, RouteHandler>
	>;
	/** Injectable params per operation (inferred from invariants) */
	readonly injectableParams?: Readonly<
		Record<string, readonly InjectableParam[]>
	>;
	/** API name for logging */
	readonly name?: string;
	/** OpenAPI spec object for /docs endpoint */
	readonly openapiSpec?: unknown;
	/** Port to listen on (default: 3000) */
	readonly port?: number;
	/** Shared runtime to use (if provided, layer is ignored for runtime creation) */
	readonly runtime?: ManagedRuntime.ManagedRuntime<R, never>;
	/** Domain schema for domain service routing (loaded from JSON at runtime) */
	readonly schema?: unknown;
	/** SSE configuration for real-time events */
	readonly sse?: SseConfig;
	/** SSE manager (created internally if SSE is enabled) */
	readonly sseManager?: SseManager;
}

/**
 * Result of creating an API.
 */
export interface ApiResult {
	/** Get route handlers for manual server setup */
	readonly handlers: Map<string, Map<string, RouteHandler>>;
	/** SSE manager for broadcasting events (if SSE is enabled) */
	readonly sseManager?: SseManager;
	/** Start the server */
	readonly start: () => Effect.Effect<
		{ port: number; stop: () => Promise<void>; url: string },
		StartupError
	>;
}

/**
 * Create an API server from operations and an Effect layer.
 *
 * @param module - Object containing operations (like the `ops` export from generated code)
 * @param layer - Effect layer providing all dependencies
 * @param config - Optional API configuration
 */
export const createApi = <R>(
	module: Record<string, unknown>,
	layer: Layer<R>,
	config: ApiConfig<R> = {},
): ApiResult => {
	const auth = config.auth;
	const authServiceTag = config.authServiceTag;
	const basePath = config.basePath ?? "/api";
	const port = config.port ?? 3000;
	const name = config.name ?? "API";
	const cors = config.cors ?? true;
	const injectableParams = config.injectableParams ?? {};

	// Extract operations from module
	const operations = Object.values(module).filter(isOperation);

	// Use provided runtime or create a managed runtime that persists layer state
	const runtime = config.runtime ?? ManagedRuntime.make(layer);

	// Cast schema to DomainSchema (loaded from JSON at runtime)
	const domainSchema = config.schema as DomainSchema | undefined;

	// Build route handlers
	const handlers = buildRouteHandlers(
		operations,
		basePath,
		injectableParams,
		domainSchema,
		runtime,
		auth,
		authServiceTag,
		config.codecRegistry,
	);

	// Add built-in routes
	addHealthRoute(handlers, basePath);

	if (config.openapiSpec) {
		addOpenApiRoutes(handlers, basePath, config.openapiSpec, name);
	}

	// Add SSE endpoint for real-time event streaming
	const sseEnabled = config.sse?.enabled ?? false;
	const ssePath = config.sse?.path ?? `${basePath}/events`;
	const sseManager =
		config.sseManager ?? (sseEnabled ? createSseManager() : undefined);

	if (sseEnabled && sseManager) {
		addSseRoute(handlers, ssePath, sseManager);
	}

	// Merge custom routes (e.g., /auth/login)
	if (config.customRoutes) {
		for (const [path, methodHandlers] of config.customRoutes) {
			handlers.set(path, new Map(methodHandlers));
		}
	}

	const start = () =>
		Effect.try({
			try: () => {
				// Build Bun.serve routes object
				const routes: Record<string, unknown> = {};

				for (const [path, methodHandlers] of handlers) {
					const routeHandlers: Record<string, unknown> = {};
					for (const [method, handler] of methodHandlers) {
						routeHandlers[method] = (request: Request) => {
							const bunRequest = request as Request & {
								params?: Record<string, string>;
							};
							const pathParams = bunRequest.params ?? {};
							return handler(request, pathParams);
						};
					}
					routes[path] = routeHandlers;
				}

				const server = Bun.serve({
					error(error) {
						console.error("Server error:", error);
						return Response.json(
							{
								error: {
									code: "InternalError",
									message: "Internal server error",
								},
							},
							{ status: 500 },
						);
					},
					fetch(request) {
						// Handle CORS preflight
						if (cors && request.method === "OPTIONS") {
							return new Response(undefined, {
								headers: {
									"Access-Control-Allow-Headers": "Content-Type, Authorization",
									"Access-Control-Allow-Methods":
										"GET, POST, PUT, PATCH, DELETE, OPTIONS",
									"Access-Control-Allow-Origin": "*",
								},
								status: 204,
							});
						}

						return Response.json(
							{ error: { code: "NotFound", message: "Route not found" } },
							{ status: 404 },
						);
					},
					port,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Bun.serve routes type is complex
					routes: routes as any,
				});

				const actualPort = server.port ?? port;
				console.info(`${name} running at http://localhost:${actualPort}`);

				const stop = async () => {
					console.info(`${name} shutting down...`);
					await server.stop(true);
					await runtime.dispose();
					console.info(`${name} stopped`);
				};

				return {
					port: actualPort,
					stop,
					url: `http://localhost:${actualPort}`,
				};
			},
			catch: (error) => {
				const isPortInUse =
					error instanceof Error &&
					error.message.includes("address already in use");
				return new StartupError({
					message: isPortInUse
						? `Port ${port} is already in use. Set PORT env var or stop the other process.`
						: `Failed to start ${name}: ${error instanceof Error ? error.message : String(error)}`,
					port,
					cause: error,
				});
			},
		});

	return {
		handlers,
		...(sseManager ? { sseManager } : {}),
		start,
	};
};
