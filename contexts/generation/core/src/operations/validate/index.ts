// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema

import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { ValidateHandler } from "./handler";

export * from "./handler";
/**
 * Validate a domain schema
 */
export const validate = defineOperation({
	name: "validate",
	description: "Validate a domain schema",
	params: S.Struct({
		schema: S.String.annotations({
			description: "The domain schema as .morph DSL or JSON text",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(ValidateHandler, (handler) =>
			handler.handle(params, options),
		),
});
