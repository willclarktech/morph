/**
 * CRUD route handler types and re-exports.
 */
import type {
	DomainSchema,
	OperationDef,
	QualifiedEntry,
} from "@morphdsl/domain-schema";

import type { UiRoute } from "../routes";

/**
 * Route handler definition.
 */
export interface RouteHandler {
	readonly comment: string;
	readonly handler: string;
	readonly method: string;
}

/**
 * Context needed for CRUD route generation.
 */
export interface CrudRouteContext {
	readonly entityName: string;
	readonly entityOps: readonly QualifiedEntry<OperationDef>[];
	readonly op: QualifiedEntry<OperationDef>;
	readonly route: UiRoute;
	readonly schema: DomainSchema;
	readonly skipCreateForAuth?: string | undefined;
}

export { generateCreateRoutes } from "./create";
export { generateDeleteRoutes } from "./delete";
export { generateDetailRoutes } from "./detail";
export { generateEditRoutes } from "./edit";
export { generateListRoutes } from "./list";
