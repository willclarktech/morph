/**
 * Create route handler generation.
 */
import { pluralize } from "@morph/utils";

import type { CrudRouteContext, RouteHandler } from "./crud";

import { operationRequiresAuth } from "../utilities";

/**
 * Generate create routes for an entity.
 */
export const generateCreateRoutes = (
	context: CrudRouteContext,
): readonly RouteHandler[] => {
	const { entityName, op, schema, skipCreateForAuth } = context;
	const pluralName = pluralize(entityName.toLowerCase());
	const requiresAuth = operationRequiresAuth(schema, op.name);

	// Skip if this is the register operation
	if (op.name === skipCreateForAuth) {
		return [];
	}

	if (requiresAuth) {
		return [
			{
				comment: `Create ${entityName} form`,
				handler: `(req: Request) => {
				initLanguage(req);
				const authState = getAuthState(req);
				if (!authState.isAuthenticated) {
					return new Response(null, { status: 303, headers: { Location: "/login" } });
				}
				return html(create${entityName}Page());
			}`,
				method: "GET",
			},
			{
				comment: `Create ${entityName} submit`,
				handler: `async (req: Request) => {
				const authState = getAuthState(req);
				if (!authState.isAuthenticated) {
					return new Response(null, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(req);
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await req.formData();
				const params = Object.fromEntries(formData) as unknown as Parameters<typeof client.${op.name}>[0];
				try {
					const result = await Effect.runPromise(client.${op.name}(params)) as ${entityName};
					// Return view page with HX-Push-Url for SPA navigation (preserves SSE connection)
					return new Response(view${entityName}Page(result), {
						status: 200,
						headers: {
							"Content-Type": "text/html",
							"HX-Push-Url": "/${pluralName}/" + result.id,
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.createFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message) + create${entityName}Page());
				}
			}`,
				method: "POST",
			},
		];
	}

	return [
		{
			comment: `Create ${entityName} form`,
			handler: `(req: Request) => {
				initLanguage(req);
				return html(create${entityName}Page());
			}`,
			method: "GET",
		},
		{
			comment: `Create ${entityName} submit`,
			handler: `async (req: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await req.formData();
				const params = Object.fromEntries(formData) as unknown as Parameters<typeof client.${op.name}>[0];
				try {
					const result = await Effect.runPromise(client.${op.name}(params)) as ${entityName};
					// Return view page with HX-Push-Url for SPA navigation (preserves SSE connection)
					return new Response(view${entityName}Page(result), {
						status: 200,
						headers: {
							"Content-Type": "text/html",
							"HX-Push-Url": "/${pluralName}/" + result.id,
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.createFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message) + create${entityName}Page());
				}
			}`,
			method: "POST",
		},
	];
};
