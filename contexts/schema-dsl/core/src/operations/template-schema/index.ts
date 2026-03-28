// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { TemplateSchemaHandler } from "./handler";

export * from "./handler";
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
