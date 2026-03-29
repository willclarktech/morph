// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslDiagnostic } from "@morphdsl/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetDiagnosticsHandler } from "./handler";

/**
 * Implementation of getDiagnostics function.
 * Get diagnostics (errors and warnings) for a .morph source file
 */
export const GetDiagnosticsHandlerLive = Layer.succeed(GetDiagnosticsHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement getDiagnostics
			// Params: source
			return yield* Effect.succeed({} as readonly DslDiagnostic[]);
		}),
});
