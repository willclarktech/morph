// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { GetFoldingRangesHandler } from "./handler";
import { getFoldingRanges as getFoldingRangesImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the getFoldingRanges impl into GetFoldingRangesHandler.
 */
export const GetFoldingRangesHandlerLive = Layer.succeed(
	GetFoldingRangesHandler,
	{
		handle: (params, options) =>
			Effect.sync(() => getFoldingRangesImpl(params, options)),
	},
);

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
