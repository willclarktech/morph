// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { InitHandler } from "./handler";
import { init as initImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the init impl into InitHandler.
 */
export const InitHandlerLive = Layer.succeed(InitHandler, {
	handle: (params, options) => Effect.sync(() => initImpl(params, options)),
});

/**
 * Initialize a new morph monorepo scaffold
 */
export const init = defineOperation({
	name: "init",
	description: "Initialize a new morph monorepo scaffold",
	params: S.Struct({
		name: S.String.annotations({ description: "Project name" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(InitHandler, (handler) => handler.handle(params, options)),
});
