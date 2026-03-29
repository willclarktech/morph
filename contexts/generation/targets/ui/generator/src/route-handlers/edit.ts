/**
 * Edit route handler generation.
 */
import { pluralize } from "@morphdsl/utils";

import type { CrudRouteContext, RouteHandler } from "./crud";

import { operationRequiresAuth } from "../utilities";

/**
 * Generate edit routes for an entity.
 */
export const generateEditRoutes = (
	context: CrudRouteContext,
): readonly RouteHandler[] => {
	const { entityName, entityOps, op, schema } = context;
	const pluralName = pluralize(entityName.toLowerCase());
	const idType = `${entityName}Id`;
	const requiresAuth = operationRequiresAuth(schema, op.name);

	// Need the get operation for pre-populating
	const getOp = entityOps.find(
		(o) =>
			(o.name.startsWith("get") && !o.name.startsWith("getAll")) ||
			o.name.startsWith("find"),
	);

	if (!getOp) {
		return [];
	}

	if (requiresAuth) {
		return [
			{
				comment: `Edit ${entityName} form`,
				handler: String.raw`async (request: Request & { params: { id: string } }) => {
				initLanguage(request);
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				const id = request.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${getOp.name}({ ${entityName.toLowerCase()}Id: id }));
					return html(edit${entityName}Page(item));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.notFound", { entity: t("entity.${entityName.toLowerCase()}.singular") });
					return html(errorAlert(message) + '<p><a href="/${pluralName}">' + t("nav.backToList") + '</a></p>');
				}
			}`,
				method: "GET",
			},
			{
				comment: `Edit ${entityName} submit`,
				handler: `async (request: Request & { params: { id: string } }) => {
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				const id = request.params.id as ${idType};
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const params = { ${entityName.toLowerCase()}Id: id, ...Object.fromEntries(formData) } as Parameters<typeof client.${op.name}>[0];
				try {
					await Effect.runPromise(client.${op.name}(params));
					return new Response(undefined, {
						status: 303,
						headers: { Location: "/${pluralName}/" + id },
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.updateFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					const item = await Effect.runPromise(client.${getOp.name}({ ${entityName.toLowerCase()}Id: id })).catch(() => ({ id } as ${entityName}));
					return html(errorAlert(message) + edit${entityName}Page(item));
				}
			}`,
				method: "PUT",
			},
		];
	}

	return [
		{
			comment: `Edit ${entityName} form`,
			handler: String.raw`async (request: Request & { params: { id: string } }) => {
				initLanguage(request);
				const id = request.params.id as ${idType};
				try {
					const item = await Effect.runPromise(client.${getOp.name}({ ${entityName.toLowerCase()}Id: id }));
					return html(edit${entityName}Page(item));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.notFound", { entity: t("entity.${entityName.toLowerCase()}.singular") });
					return html(errorAlert(message) + '<p><a href="/${pluralName}">' + t("nav.backToList") + '</a></p>');
				}
			}`,
			method: "GET",
		},
		{
			comment: `Edit ${entityName} submit`,
			handler: `async (request: Request & { params: { id: string } }) => {
				const id = request.params.id as ${idType};
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const params = { ${entityName.toLowerCase()}Id: id, ...Object.fromEntries(formData) } as Parameters<typeof client.${op.name}>[0];
				try {
					await Effect.runPromise(client.${op.name}(params));
					return new Response(undefined, {
						status: 303,
						headers: { Location: "/${pluralName}/" + id },
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.updateFailed", { entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					const item = await Effect.runPromise(client.${getOp.name}({ ${entityName.toLowerCase()}Id: id })).catch(() => ({ id } as ${entityName}));
					return html(errorAlert(message) + edit${entityName}Page(item));
				}
			}`,
			method: "PUT",
		},
	];
};
