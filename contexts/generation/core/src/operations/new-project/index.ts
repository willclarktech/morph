// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { NewProjectHandler } from "./handler";

export * from "./handler";
/**
 * Create a new morph project (init + generate)
 */
export const newProject = defineOperation({
	name: "newProject",
	description: "Create a new morph project (init + generate)",
	params: S.Struct({
		name: S.String.annotations({ description: "Project name" }),
		schema: S.String.annotations({
			description: "The domain schema as .morph DSL or JSON text",
		}),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(NewProjectHandler, (handler) =>
			handler.handle(params, options),
		),
});
