// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { GetFoldingRangesHandler } from "./handler";

export * from "./handler";
/**
 * Get folding ranges for a .morph source file
 */
export const getFoldingRanges = defineOperation({
	name: "getFoldingRanges",
	description: "Get folding ranges for a .morph source file",
	params: S.Struct({
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetFoldingRangesHandler, (handler) =>
			handler.handle(params, options),
		),
});
