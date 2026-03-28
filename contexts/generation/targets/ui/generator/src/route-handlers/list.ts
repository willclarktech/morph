/**
 * List route handler generation.
 */
import type { CrudRouteContext, RouteHandler } from "./crud";

import { getInjectableParamNames, operationRequiresAuth } from "../utilities";

/**
 * Generate list routes for an entity.
 */
export const generateListRoutes = (
	context: CrudRouteContext,
): readonly RouteHandler[] => {
	const { entityName, op, schema } = context;
	const requiresAuth = operationRequiresAuth(schema, op.name);

	// Injectable params are handled by the API - don't pass them to the client
	const hasNonInjectableParams = Object.keys(op.def.input).some(
		(name) => !getInjectableParamNames(schema, op.name).has(name),
	);
	const callArguments = hasNonInjectableParams ? "({})" : "()";

	if (requiresAuth) {
		return [
			{
				comment: `List ${entityName}`,
				handler: `async (request: Request) => {
				initLanguage(request);
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				try {
					const items = await Effect.runPromise(client.${op.name}${callArguments}) as readonly ${entityName}[];
					return html(list${entityName}Page(items));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.loadFailed", { entity: t("entity.${entityName.toLowerCase()}.plural").toLowerCase() });
					return html(errorAlert(message) + list${entityName}Page([]));
				}
			}`,
				method: "GET",
			},
		];
	}

	return [
		{
			comment: `List ${entityName}`,
			handler: `async (request: Request) => {
				initLanguage(request);
				try {
					const items = await Effect.runPromise(client.${op.name}${callArguments}) as readonly ${entityName}[];
					return html(list${entityName}Page(items));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.loadFailed", { entity: t("entity.${entityName.toLowerCase()}.plural").toLowerCase() });
					return html(errorAlert(message) + list${entityName}Page([]));
				}
			}`,
			method: "GET",
		},
	];
};
