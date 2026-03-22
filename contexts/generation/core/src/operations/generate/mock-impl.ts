// Generated mock handler implementation (fallback - no arbitraries available)
// Returns a stub error since proper mocks require arbitraries
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";

import { GenerateHandler } from "./handler";
export const GenerateHandlerMock = Layer.succeed(GenerateHandler, {
	handle: (_params, _options) =>
		Effect.die(new Error("Mock not available: generate requires arbitraries")),
});
