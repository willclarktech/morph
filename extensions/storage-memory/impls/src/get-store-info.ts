import { Context, Effect, Layer, Ref } from "effect";

import type { MemoryStoreInfo } from "@morph/storage-memory-dsl";

import { getStoreRegistry } from "./store-registry";

export interface GetStoreInfoHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<MemoryStoreInfo, never>;
}

export const GetStoreInfoHandler = Context.GenericTag<GetStoreInfoHandler>(
	"@morph/GetStoreInfoHandler",
);

export const GetStoreInfoHandlerLive = Layer.succeed(GetStoreInfoHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			const registry = getStoreRegistry();
			let entryCount = 0;
			for (const store of registry.values()) {
				const m = yield* Ref.get(store);
				entryCount += m.size;
			}
			return {
				entryCount,
				collectionCount: registry.size,
			} satisfies MemoryStoreInfo;
		}),
});
