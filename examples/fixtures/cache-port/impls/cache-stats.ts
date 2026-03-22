// Handler implementation for cacheStats function

import type { CacheStatistics } from "@cache-port/caching-dsl";

import { Effect, Layer } from "effect";

import { CacheStatsHandler } from "./handler";

export const CacheStatsHandlerLive = Layer.succeed(CacheStatsHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			const stats: CacheStatistics = {
				hits: 0n,
				misses: 0n,
				size: 0n,
			};
			return stats;
		}),
});
