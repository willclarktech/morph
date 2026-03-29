// Template for implementing the function handler.
// This file is NOT imported by the core package.
// Copy to your impls package and implement the logic.
import type { DslSymbol } from "@morphdsl/schema-dsl-dsl";

import { Effect, Layer } from "effect";

import { GetSymbolsHandler } from "./handler";

/**
 * Implementation of getSymbols function.
 * Get document symbols (outline) for a .morph source file
 */
export const GetSymbolsHandlerLive = Layer.succeed(GetSymbolsHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			// TODO: Implement getSymbols
			// Params: source
			return yield* Effect.succeed({} as readonly DslSymbol[]);
		}),
});
