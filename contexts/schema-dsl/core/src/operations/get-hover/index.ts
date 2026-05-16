// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { GetHoverHandler } from "./handler";
import { getHover as getHoverImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the getHover impl into GetHoverHandler.
 */
export const GetHoverHandlerLive = Layer.succeed(GetHoverHandler, {
	handle: (params, options) => Effect.sync(() => getHoverImpl(params, options)),
});

/**
 * Get hover information at a position in a .morph source file
 */
export const getHover = defineOperation({
	name: "getHover",
	description: "Get hover information at a position in a .morph source file",
	params: S.Struct({
		column: S.Number.annotations({ description: "Column number (1-based)" }),
		line: S.Number.annotations({ description: "Line number (1-based)" }),
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetHoverHandler, (handler) =>
			handler.handle(params, options),
		),
});
