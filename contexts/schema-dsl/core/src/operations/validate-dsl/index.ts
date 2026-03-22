// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema

import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { ValidateDslHandler } from "./handler";

export * from "./handler";
/**
 * Validate a .morph DSL source file
 */
export const validateDsl = defineOperation({
	name: "validateDsl",
	description: "Validate a .morph DSL source file",
	params: S.Struct({
		source: S.String.annotations({
			description: "The .morph DSL source text to validate",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(ValidateDslHandler, (handler) =>
			handler.handle(params, options),
		),
});
