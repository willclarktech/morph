// Implementation of cacheStats function

import type { CacheStatistics } from "@cache-port/caching-dsl";

export const cacheStats = (
	_params: Record<string, never>,
	_options: Record<string, never>,
): CacheStatistics => ({
	hits: 0n,
	misses: 0n,
	size: 0n,
});
