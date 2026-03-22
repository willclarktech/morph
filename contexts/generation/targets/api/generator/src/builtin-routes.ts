/**
 * Built-in routes: health check, OpenAPI spec, Swagger UI.
 */
import type { RouteHandler } from "./handler";

import { swaggerUIHtml } from "./swagger";

/**
 * Add health check endpoint.
 */
export const addHealthRoute = (
	handlers: Map<string, Map<string, RouteHandler>>,
	basePath: string,
): void => {
	const healthPath = `${basePath}/health`;
	handlers.set(
		healthPath,
		new Map([["GET", () => Promise.resolve(new Response("OK"))]]),
	);
};

/**
 * Add OpenAPI spec and Swagger UI endpoints.
 */
export const addOpenApiRoutes = (
	handlers: Map<string, Map<string, RouteHandler>>,
	basePath: string,
	openapiSpec: unknown,
	apiName: string,
): void => {
	const specPath = `${basePath}/openapi.json`;
	const docsPath = `${basePath}/docs`;

	// Serve raw OpenAPI spec
	handlers.set(
		specPath,
		new Map([
			[
				"GET",
				() =>
					Promise.resolve(
						Response.json(openapiSpec, {
							headers: { "Cache-Control": "public, max-age=3600" },
						}),
					),
			],
		]),
	);

	// Serve Swagger UI
	handlers.set(
		docsPath,
		new Map([
			[
				"GET",
				() =>
					Promise.resolve(
						new Response(swaggerUIHtml(apiName, specPath), {
							headers: { "Content-Type": "text/html" },
						}),
					),
			],
		]),
	);
};
