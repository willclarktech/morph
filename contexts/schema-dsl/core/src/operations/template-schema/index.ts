// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { TemplateSchemaHandler } from "./handler";
import { templateSchema as templateSchemaImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the templateSchema impl into TemplateSchemaHandler.
 */
export const TemplateSchemaHandlerLive = Layer.succeed(TemplateSchemaHandler, {
	handle: (params, options) =>
		Effect.sync(() => templateSchemaImpl(params, options)),
});

/**
 * Get a template .morph schema showing all available DSL features and field types
 */
export const templateSchema = defineOperation({
	name: "templateSchema",
	description:
		"Get a template .morph schema showing all available DSL features and field types",
	params: S.Struct({}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(TemplateSchemaHandler, (handler) =>
			handler.handle(params, options),
		),
});
