/**
 * Detail view route handler generation.
 */
import { pluralize } from "@morph/utils";

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
				handler: String.raw`async (req: Request & { params: { id: string } }) => {
				initLanguage(req);
				const authState = getAuthState(req);
				if (!authState.isAuthenticated) {
					return new Response(null, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(req);
				const id = req.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id })) as ${entityName};
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
			handler: String.raw`async (req: Request & { params: { id: string } }) => {
				initLanguage(req);
				const id = req.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${op.name}({ ${entityName.toLowerCase()}Id: id })) as ${entityName};
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
