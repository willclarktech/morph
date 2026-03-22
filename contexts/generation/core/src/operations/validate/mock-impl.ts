// Generated mock handler implementation for function
// Returns deterministic random data using fast-check arbitraries
// Do not edit - regenerate from schema

import { Effect, Layer } from "effect";
import * as fc from "fast-check";

import { ValidateHandler } from "./handler";
const MOCK_SEED = 42;

export const ValidateHandlerMock = Layer.succeed(ValidateHandler, {
	handle: (_params, _options) =>
		Effect.sync(() => {
			const results = fc.sample(fc.constant(undefined), {
				seed: MOCK_SEED,
				numRuns: 1,
			});
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- numRuns: 1 guarantees one element
			return results[0]!;
		}),
});
