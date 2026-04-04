import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

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

export const TemplateSchemaHandlerLive = Layer.succeed(TemplateSchemaHandler, {
	handle: () => E.succeed(TEMPLATE_SCHEMA),
});

export { default as TEMPLATE_SCHEMA } from "./template.morph";
