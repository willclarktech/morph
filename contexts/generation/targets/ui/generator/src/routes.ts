/**
 * Route inference for UI generation.
 */
import { pluralize, toKebabCase } from "@morph/utils";

/**
 * UI route definition.
 */
export interface UiRoute {
	readonly method: string;
	readonly pageType: string;
	readonly path: string;
}

/**
 * Infer UI route pattern from operation name.
 */
export const inferUiRoute = (opName: string, entityName: string): UiRoute => {
	const plural = pluralize(entityName.toLowerCase());

	if (opName.startsWith("create") || opName.startsWith("add")) {
		return { method: "POST", pageType: "create", path: `/${plural}/new` };
	}
	if (opName.startsWith("list") || opName.startsWith("getAll")) {
		return { method: "GET", pageType: "list", path: `/${plural}` };
	}
	if (opName.startsWith("get") || opName.startsWith("find")) {
		return { method: "GET", pageType: "detail", path: `/${plural}/:id` };
	}
	if (opName.startsWith("update") || opName.startsWith("edit")) {
		return { method: "PUT", pageType: "edit", path: `/${plural}/:id/edit` };
	}
	if (opName.startsWith("delete") || opName.startsWith("remove")) {
		return { method: "DELETE", pageType: "delete", path: `/${plural}/:id` };
	}

	// Default: treat as custom action
	return {
		method: "POST",
		pageType: "action",
		path: `/${plural}/${toKebabCase(opName)}`,
	};
};
