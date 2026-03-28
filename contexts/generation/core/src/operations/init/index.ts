// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { InitHandler } from "./handler";

export * from "./handler";
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
