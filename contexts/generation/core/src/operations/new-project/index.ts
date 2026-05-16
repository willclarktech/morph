// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { NewProjectHandler } from "./handler";
import { newProject as newProjectImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the newProject impl into NewProjectHandler.
 */
export const NewProjectHandlerLive = Layer.succeed(NewProjectHandler, {
	handle: (params, options) => newProjectImpl(params, options),
});

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
