import { Context, Effect } from "effect";

import TEMPLATE_SCHEMA from "./template.morph";

export interface TemplateSchemaHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<string>;
}

export const TemplateSchemaHandler = Context.GenericTag<TemplateSchemaHandler>(
	"@morphdsl/impls/TemplateSchemaHandler",
);

export const templateSchema = (
	_params: Record<string, never>,
	_options: Record<string, never>,
): string => TEMPLATE_SCHEMA;

export { default as TEMPLATE_SCHEMA } from "./template.morph";
