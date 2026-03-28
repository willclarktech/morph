/**
 * Delete route handler generation.
 */
import type { CrudRouteContext, RouteHandler } from "./crud";

import { operationRequiresAuth } from "../utilities";

/**
 * Generate delete routes for an entity.
 */
export const generateDeleteRoutes = (
	context: CrudRouteContext,
): readonly RouteHandler[] => {
	const { entityName, op, schema } = context;
	const idType = `${entityName}Id`;
	const requiresAuth = operationRequiresAuth(schema, op.name);

	if (requiresAuth) {
		return [
			{
				comment: `Delete ${entityName}`,
				handler: `async (request: Request & { params: { id: string } }) => {
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				const id = request.params.id as ${idType};
				try {
					await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id }));
					// Return empty for HTMX to remove the row
					return html("");
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.deleteFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message));
				}
			}`,
				method: "DELETE",
			},
		];
	}

	return [
		{
			comment: `Delete ${entityName}`,
			handler: `async (request: Request & { params: { id: string } }) => {
				const id = request.params.id as ${idType};
				try {
					await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id }));
					// Return empty for HTMX to remove the row
					return html("");
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.deleteFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message));
				}
			}`,
			method: "DELETE",
		},
	];
};
