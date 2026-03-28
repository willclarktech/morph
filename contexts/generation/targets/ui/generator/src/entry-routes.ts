import type { OperationDef, QualifiedEntry } from "@morph/domain-schema";

import {
	getAllCommands,
	getAllEntities,
	getAllFunctions,
	getAllOperations,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";
import { pluralize, separator, toKebabCase } from "@morph/utils";

import type { GenerateUiAppOptions } from "./config";
import type { RouteHandler } from "./route-handlers";

import { detectAuthOperations } from "./auth/detection";
import {
	generateActionRoutes,
	generateAuthRoutes,
	generateCreateRoutes,
	generateDeleteRoutes,
	generateDetailRoutes,
	generateEditRoutes,
	generateFunctionRoutes,
	generateListRoutes,
	generateSessionCode,
	getAuthPageImports,
} from "./route-handlers";
import { inferUiRoute } from "./routes";
import { extractActionVerb, getActionCommands } from "./utilities";

export interface EntryRouteResult {
	readonly authRoutes: string;
	readonly hasEntities: boolean;
	readonly pageImports: string[];
	readonly routeHandlers: string[];
	readonly sessionCode: string;
	readonly typeImports: string[];
}

export const buildEntryRoutes = (
	options: GenerateUiAppOptions,
): EntryRouteResult => {
	const { envPrefix = "APP" } = options;
	const ops = getAllOperations(options.schema).filter((op) =>
		op.def.tags.includes("@ui"),
	);
	const entities = getAllEntities(options.schema);
	const hasAuth = schemaHasAuthRequirement(options.schema);
	const resolvedAuthOps = detectAuthOperations(ops);

	// Group operations by entity
	const entityOps = new Map<string, QualifiedEntry<OperationDef>[]>();
	for (const op of ops) {
		for (const entity of entities) {
			if (op.name.toLowerCase().includes(entity.name.toLowerCase())) {
				const existing = entityOps.get(entity.name) ?? [];
				existing.push(op);
				entityOps.set(entity.name, existing);
				break;
			}
		}
	}

	// Collect route handlers by path (to merge methods on same path)
	const routesByPath = new Map<string, RouteHandler[]>();
	const entitiesNeedingIdImport = new Set<string>();
	const hasEntities = entityOps.size > 0;
	const pageImports: string[] = hasEntities
		? ["homePage", "errorAlert"]
		: ["homePage"];

	if (hasAuth) {
		pageImports.push(...getAuthPageImports(resolvedAuthOps));
	}

	const addRoute = (path: string, handler: RouteHandler) => {
		const existing = routesByPath.get(path) ?? [];
		existing.push(handler);
		routesByPath.set(path, existing);
	};

	const addRoutes = (path: string, handlers: readonly RouteHandler[]) => {
		for (const handler of handlers) {
			addRoute(path, handler);
		}
	};

	for (const [entityName, entityOpsList] of entityOps) {
		const pluralName = pluralize(entityName.toLowerCase());

		for (const op of entityOpsList) {
			const route = inferUiRoute(op.name, entityName);
			const context = {
				entityName,
				entityOps: entityOpsList,
				op,
				route,
				schema: options.schema,
				skipCreateForAuth: resolvedAuthOps.register?.name,
			};

			switch (route.pageType) {
				case "create": {
					if (op.name !== resolvedAuthOps.register?.name) {
						pageImports.push(`create${entityName}Page`);
					}
					addRoutes(`/${pluralName}/new`, generateCreateRoutes(context));
					break;
				}
				case "delete": {
					entitiesNeedingIdImport.add(entityName);
					addRoutes(`/${pluralName}/:id`, generateDeleteRoutes(context));
					break;
				}
				case "detail": {
					entitiesNeedingIdImport.add(entityName);
					pageImports.push(`view${entityName}Page`);
					addRoutes(`/${pluralName}/:id`, generateDetailRoutes(context));
					break;
				}
				case "edit": {
					entitiesNeedingIdImport.add(entityName);
					pageImports.push(`edit${entityName}Page`);
					addRoutes(`/${pluralName}/:id/edit`, generateEditRoutes(context));
					break;
				}
				case "list": {
					if (!pageImports.includes(`list${entityName}Page`)) {
						pageImports.push(`list${entityName}Page`);
					}
					addRoutes(`/${pluralName}`, generateListRoutes(context));
					break;
				}
				// No default
			}
		}

		// Add routes for single-action commands (e.g., completeTodo, archivePost)
		const entity = entities.find((ent) => ent.name === entityName);
		if (entity) {
			const actionCmds = getActionCommands(
				entity,
				getAllCommands(options.schema),
				options.schema,
			);
			if (actionCmds.length > 0) {
				entitiesNeedingIdImport.add(entityName);
				if (!pageImports.includes(`list${entityName}Page`)) {
					pageImports.push(`list${entityName}Page`);
				}
				if (!pageImports.includes(`view${entityName}Page`)) {
					pageImports.push(`view${entityName}Page`);
				}
			}
			for (const cmd of actionCmds) {
				const action = extractActionVerb(cmd.name, entityName);
				const actionKebab = toKebabCase(action);

				addRoutes(
					`/${pluralName}/:id/${actionKebab}`,
					generateActionRoutes({
						action,
						actionKebab,
						cmd,
						entityName,
						entityOps: entityOpsList,
						schema: options.schema,
					}),
				);
			}
		}
	}

	// Function routes
	const uiFuncs = getAllFunctions(options.schema).filter((function_) =>
		function_.def.tags.includes("@ui"),
	);

	for (const function_ of uiFuncs) {
		const functionKebab = toKebabCase(function_.name);
		pageImports.push(`${function_.name}Page`);
		addRoutes(`/functions/${functionKebab}`, generateFunctionRoutes(function_));
	}

	// Generate route definitions with merged methods
	const routeHandlers: string[] = [];
	for (const [path, handlers] of routesByPath) {
		const comments = [...new Set(handlers.map((h) => h.comment))];
		const methods = handlers.map((h) => `${h.method}: ${h.handler}`);
		routeHandlers.push(`
		// ${comments.join(", ")}
		"${path}": {
			${methods.join(separator(3, ","))},
		},`);
	}

	// Type imports from DSL (entity names for type casts + IDs for :id routes)
	const typeImportsSet = new Set([
		...[...entitiesNeedingIdImport].map((entityName) => `${entityName}Id`),
		...entityOps.keys(),
	]);

	const typeImports = [...typeImportsSet];

	// Session and auth routes
	const sessionCode = hasAuth ? generateSessionCode(envPrefix) : "";
	const authRoutes = hasAuth
		? generateAuthRoutes(resolvedAuthOps, envPrefix)
		: "";

	return {
		authRoutes,
		hasEntities,
		pageImports,
		routeHandlers,
		sessionCode,
		typeImports,
	};
};
