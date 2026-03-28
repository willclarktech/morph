// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { DecompileSchemaHandler } from "./handler";

export * from "./handler";
/**
 * Convert a domain schema JSON to .morph DSL text
 */
export const decompileSchema = defineOperation({
	name: "decompileSchema",
	description: "Convert a domain schema JSON to .morph DSL text",
	params: S.Struct({
		schema: S.String.annotations({
			description: "Domain schema as JSON string",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(DecompileSchemaHandler, (handler) =>
			handler.handle(params, options),
		),
});
