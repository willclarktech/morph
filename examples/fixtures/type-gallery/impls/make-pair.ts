// Handler implementation for makePair function

import type { Pair } from "@type-gallery/types-dsl";

import { Effect, Layer } from "effect";

import { MakePairHandler } from "./handler";

export const MakePairHandlerLive = Layer.succeed(MakePairHandler, {
	handle: (params, _options) =>
		Effect.succeed({
			first: params.first,
			second: params.second,
		} satisfies Pair<string, string>),
});
