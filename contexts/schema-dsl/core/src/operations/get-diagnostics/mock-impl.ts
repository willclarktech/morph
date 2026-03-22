// Generated mock handler implementation (fallback - no arbitraries available)
// Returns a stub error since proper mocks require arbitraries
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";

import { GetDiagnosticsHandler } from "./handler";
export const GetDiagnosticsHandlerMock = Layer.succeed(GetDiagnosticsHandler, {
	handle: (_params, _options) =>
		Effect.die(
			new Error("Mock not available: getDiagnostics requires arbitraries"),
		),
});
