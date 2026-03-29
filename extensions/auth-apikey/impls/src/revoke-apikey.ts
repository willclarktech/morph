import type { ApiKeyStorageError } from "@morphdsl/auth-apikey-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { revokeApiKey } from "./apikey-store";

export interface RevokeApiKeyHandler {
	readonly handle: (
		params: { readonly keyId: string },
		options: object,
	) => Effect.Effect<void, ApiKeyStorageError>;
}

export const RevokeApiKeyHandler = Context.GenericTag<RevokeApiKeyHandler>(
	"@morphdsl/RevokeApiKeyHandler",
);

export const RevokeApiKeyHandlerLive = Layer.succeed(RevokeApiKeyHandler, {
	handle: (params) => revokeApiKey(params.keyId),
});
