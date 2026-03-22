import { Context, Effect, Layer } from "effect";

import type {
	ApiKey,
	ApiKeyExpiredError,
	ApiKeyInvalidError,
	ApiKeyStorageError,
} from "@morph/auth-apikey-dsl";
import { validateApiKey } from "./apikey-store";

export interface ValidateApiKeyHandler {
	readonly handle: (
		params: { readonly key: string },
		options: object,
	) => Effect.Effect<
		ApiKey,
		ApiKeyInvalidError | ApiKeyExpiredError | ApiKeyStorageError
	>;
}

export const ValidateApiKeyHandler = Context.GenericTag<ValidateApiKeyHandler>(
	"@morph/ValidateApiKeyHandler",
);

export const ValidateApiKeyHandlerLive = Layer.succeed(ValidateApiKeyHandler, {
	handle: (params) => validateApiKey(params.key),
});
