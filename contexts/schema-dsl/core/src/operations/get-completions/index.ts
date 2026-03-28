// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { GetCompletionsHandler } from "./handler";

export * from "./handler";
/**
 * Get context-aware completions at a position in a .morph source file
 */
export const getCompletions = defineOperation({
	name: "getCompletions",
	description:
		"Get context-aware completions at a position in a .morph source file",
	params: S.Struct({
		column: S.Number.annotations({ description: "Column number (1-based)" }),
		line: S.Number.annotations({ description: "Line number (1-based)" }),
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetCompletionsHandler, (handler) =>
			handler.handle(params, options),
		),
});
