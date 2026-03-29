/**
 * Action command route handler generation.
 */
import type {
	CommandDef,
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import { pluralize, toTitleCase } from "@morphdsl/utils";

import type { RouteHandler } from "./crud";

import { operationRequiresAuth } from "../utilities";

/**
 * Context needed for action route generation.
 */
export interface ActionRouteContext {
	readonly action: string;
	readonly actionKebab: string;
	readonly cmd: QualifiedEntry<CommandDef>;
	readonly entityName: string;
	readonly entityOps: readonly QualifiedEntry<OperationDef>[];
	readonly schema: DomainSchema;
}

/**
 * Generate action routes for a command.
 */
export const generateActionRoutes = (
	context: ActionRouteContext,
): readonly RouteHandler[] => {
	const { action, cmd, entityName, entityOps, schema } = context;
	const pluralName = pluralize(entityName.toLowerCase());
	const idType = `${entityName}Id`;
	const requiresAuth = operationRequiresAuth(schema, cmd.name);

	// Need to find list and get operations for re-rendering after action
	const listOp = entityOps.find(
		(o) => o.name.startsWith("list") || o.name.startsWith("getAll"),
	);
	const getOp = entityOps.find(
		(o) =>
			(o.name.startsWith("get") && !o.name.startsWith("getAll")) ||
			o.name.startsWith("find"),
	);

	if (requiresAuth) {
		return [
			{
				comment: `${toTitleCase(action)} ${entityName}`,
				handler: `async (request: Request & { params: { id: string } }) => {
				const authState = getAuthState(request);
				if (!authState.isAuthenticated) {
					return new Response(undefined, { status: 303, headers: { Location: "/login" } });
				}
				const client = createClientForRequest(request);
				const id = request.params.id as ${idType};
				try {
					await Effect.runPromise(client.${cmd.name}({ ${entityName.toLowerCase()}Id: id }));
					// Return appropriate page based on referring URL (list vs detail)
					const referer = request.headers.get("HX-Current-URL") ?? "";
					const isFromList = referer.endsWith("/${pluralName}") || referer.endsWith("/${pluralName}/");
					if (isFromList) {
						const items = await Effect.runPromise(client.${listOp?.name ?? `list${pluralName.charAt(0).toUpperCase() + pluralName.slice(1)}`}({}));
						return new Response(list${entityName}Page(items), {
							status: 200,
							headers: { "Content-Type": "text/html" },
						});
					} else {
						const item = await Effect.runPromise(client.${getOp?.name ?? `get${entityName}`}({ ${entityName.toLowerCase()}Id: id }));
						return new Response(view${entityName}Page(item), {
							status: 200,
							headers: { "Content-Type": "text/html" },
						});
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.actionFailed", { action: "${action.toLowerCase()}", entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message));
				}
			}`,
				method: "POST",
			},
		];
	}

	return [
		{
			comment: `${toTitleCase(action)} ${entityName}`,
			handler: `async (request: Request & { params: { id: string } }) => {
				const id = request.params.id as ${idType};
				try {
					await Effect.runPromise(client.${cmd.name}({ ${entityName.toLowerCase()}Id: id }));
					// Return appropriate page based on referring URL (list vs detail)
					const referer = request.headers.get("HX-Current-URL") ?? "";
					const isFromList = referer.endsWith("/${pluralName}") || referer.endsWith("/${pluralName}/");
					if (isFromList) {
						const items = await Effect.runPromise(client.${listOp?.name ?? `list${pluralName.charAt(0).toUpperCase() + pluralName.slice(1)}`}({}));
						return new Response(list${entityName}Page(items), {
							status: 200,
							headers: { "Content-Type": "text/html" },
						});
					} else {
						const item = await Effect.runPromise(client.${getOp?.name ?? `get${entityName}`}({ ${entityName.toLowerCase()}Id: id }));
						return new Response(view${entityName}Page(item), {
							status: 200,
							headers: { "Content-Type": "text/html" },
						});
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.actionFailed", { action: "${action.toLowerCase()}", entity: t("entity.${entityName.toLowerCase()}.singular").toLowerCase() });
					return html(errorAlert(message));
				}
			}`,
			method: "POST",
		},
	];
};
