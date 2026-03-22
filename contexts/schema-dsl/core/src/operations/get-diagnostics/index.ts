// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema

import { defineOperation } from "@morph/operation";
import { Effect } from "effect";
import * as S from "effect/Schema";

import { GetDiagnosticsHandler } from "./handler";

export * from "./handler";
/**
 * Get diagnostics (errors and warnings) for a .morph source file
 */
export const getDiagnostics = defineOperation({
	name: "getDiagnostics",
	description: "Get diagnostics (errors and warnings) for a .morph source file",
	params: S.Struct({
		source: S.String.annotations({ description: "The .morph DSL source text" }),
	}),
	options: S.Struct({}),
	execute: (params, options) =>
		Effect.flatMap(GetDiagnosticsHandler, (handler) =>
			handler.handle(params, options),
		),
});
