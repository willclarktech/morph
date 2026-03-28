// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { GetDefinitionHandler } from "./handler";

export * from "./handler";
/**
 * Get go-to-definition location for a symbol at a position in a .morph source file
 */
export const getDefinition = defineOperation({
	name: "getDefinition",
	description:
		"Get go-to-definition location for a symbol at a position in a .morph source file",
	params: S.Struct({
		column: S.Number.annotations({ description: "Column number (1-based)" }),
		line: S.Number.annotations({ description: "Line number (1-based)" }),
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetDefinitionHandler, (handler) =>
			handler.handle(params, options),
		),
});
