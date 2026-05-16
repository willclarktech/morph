// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { GenerateHandler } from "./handler";
import { generate as generateImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the generate impl into GenerateHandler.
 */
export const GenerateHandlerLive = Layer.succeed(GenerateHandler, {
	handle: (params, options) => generateImpl(params, options),
});

/**
 * Generate all packages from a domain schema
 */
export const generate = defineOperation({
	name: "generate",
	description: "Generate all packages from a domain schema",
	params: S.Struct({
		name: S.String.annotations({
			description: "Project name for package naming",
		}),
		schema: S.String.annotations({
			description: "The domain schema as .morph DSL or JSON text",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GenerateHandler, (handler) =>
			handler.handle(params, options),
		),
});
