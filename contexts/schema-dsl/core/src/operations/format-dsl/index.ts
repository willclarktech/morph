// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { FormatDslHandler } from "./handler";

export * from "./handler";
/**
 * Format .morph DSL source text (parse and re-emit)
 */
export const formatDsl = defineOperation({
	name: "formatDsl",
	description: "Format .morph DSL source text (parse and re-emit)",
	params: S.Struct({
		source: S.String.annotations({
			description: "The .morph DSL source text to format",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(FormatDslHandler, (handler) =>
			handler.handle(params, options),
		),
});
