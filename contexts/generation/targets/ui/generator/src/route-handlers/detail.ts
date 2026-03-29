/**
 * Detail view route handler generation.
 */
import { pluralize } from "@morphdsl/utils";

import type { CrudRouteContext, RouteHandler } from "./crud";

import { operationRequiresAuth } from "../utilities";

/**
 * Generate detail view routes for an entity.
 */
export const generateDetailRoutes = (
	context: CrudRouteContext,
): readonly RouteHandler[] => {
	const { entityName, op, schema } = context;
	const pluralName = pluralize(entityName.toLowerCase());
	const idType = `${entityName}Id`;
	const requiresAuth = operationRequiresAuth(schema, op.name);

	if (requiresAuth) {
		return [
			{
				comment: `View ${entityName}`,
				handler: String.raw`async (request: Request & { params: { id: string } }) => {
				initLanguage(request);
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				const id = request.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id }));
					return html(view${entityName}Page(item));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.notFound", { entity: t("entity.${entityName.toLowerCase()}.singular") });
					return html(errorAlert(message) + '<p><a href="/${pluralName}">' + t("nav.backToList") + '</a></p>');
				}
			}`,
				method: "GET",
			},
		];
	}

	return [
		{
			comment: `View ${entityName}`,
			handler: String.raw`async (request: Request & { params: { id: string } }) => {
				initLanguage(request);
				const id = request.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id }));
					return html(view${entityName}Page(item));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.notFound", { entity: t("entity.${entityName.toLowerCase()}.singular") });
					return html(errorAlert(message) + '<p><a href="/${pluralName}">' + t("nav.backToList") + '</a></p>');
				}
			}`,
			method: "GET",
		},
	];
};
