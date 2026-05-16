// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { ParseMorphHandler } from "./handler";
import { parseMorph as parseMorphImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the parseMorph impl into ParseMorphHandler.
 */
export const ParseMorphHandlerLive = Layer.succeed(ParseMorphHandler, {
	handle: (params, options) => parseMorphImpl(params, options),
});

/**
 * Parse and compile a .morph DSL source to domain schema JSON
 */
export const parseMorph = defineOperation({
	name: "parseMorph",
	description: "Parse and compile a .morph DSL source to domain schema JSON",
	params: S.Struct({
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(ParseMorphHandler, (handler) =>
			handler.handle(params, options),
		),
});
