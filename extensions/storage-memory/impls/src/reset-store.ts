import { Context, Effect, Layer } from "effect";

import { clearStoreRegistry } from "./store-registry";

export interface ResetStoreHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<void, never>;
}

export const ResetStoreHandler = Context.GenericTag<ResetStoreHandler>(
	"@morph/ResetStoreHandler",
);

export const ResetStoreHandlerLive = Layer.succeed(ResetStoreHandler, {
	handle: (_params, _options) =>
		Effect.sync(() => {
			clearStoreRegistry();
		}),
});
