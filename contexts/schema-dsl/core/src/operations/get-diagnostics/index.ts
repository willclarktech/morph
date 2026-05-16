// Generated function operation - delegates to injected handler
// Do not edit - regenerate from schema
import { defineOperation } from "@morphdsl/operation";
import { Effect, Layer } from "effect";
import * as S from "effect/Schema";

import { GetDiagnosticsHandler } from "./handler";
import { getDiagnostics as getDiagnosticsImpl } from "./impl";

export * from "./handler";
/**
 * Live Layer binding the getDiagnostics impl into GetDiagnosticsHandler.
 */
export const GetDiagnosticsHandlerLive = Layer.succeed(GetDiagnosticsHandler, {
	handle: (params, options) =>
		Effect.sync(() => getDiagnosticsImpl(params, options)),
});

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
