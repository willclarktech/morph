// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema

import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { ParseMorphHandler } from "./handler";

export * from "./handler";
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
