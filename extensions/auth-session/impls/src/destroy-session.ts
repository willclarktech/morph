import { Context, Layer } from "effect";

import type { SessionStorageError } from "@morph/auth-session-dsl";
import type { Effect } from "effect";
import { destroySession } from "./session-store";

export interface DestroySessionHandler {
	readonly handle: (
		params: { readonly sessionId: string },
		options: Record<string, never>,
	) => Effect.Effect<void, SessionStorageError>;
}

export const DestroySessionHandler = Context.GenericTag<DestroySessionHandler>(
	"@morph/DestroySessionHandler",
);

export const DestroySessionHandlerLive = Layer.succeed(DestroySessionHandler, {
	handle: (params, _options) => destroySession(params.sessionId),
});
