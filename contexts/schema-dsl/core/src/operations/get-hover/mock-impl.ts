// Generated mock handler implementation (fallback - no arbitraries available)
// Returns a stub error since proper mocks require arbitraries
// Do not edit - regenerate from schema
import { Effect, Layer } from "effect";

import { GetHoverHandler } from "./handler";

export const GetHoverHandlerMock = Layer.succeed(GetHoverHandler, {
	handle: (_params, _options) =>
		Effect.die(new Error("Mock not available: getHover requires arbitraries")),
});
