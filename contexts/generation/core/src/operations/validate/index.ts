// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { ValidateHandler } from "./handler";
import { validate as validateImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the validate impl into ValidateHandler.
 */
export const ValidateHandlerLive = Layer.succeed(ValidateHandler, {
	handle: (params, options) => validateImpl(params, options),
});

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
