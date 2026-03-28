// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { GetSymbolsHandler } from "./handler";

export * from "./handler";
/**
 * Get document symbols (outline) for a .morph source file
 */
export const getSymbols = defineOperation({
	name: "getSymbols",
	description: "Get document symbols (outline) for a .morph source file",
	params: S.Struct({
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetSymbolsHandler, (handler) =>
			handler.handle(params, options),
		),
});
