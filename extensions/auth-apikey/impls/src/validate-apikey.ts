import type {
	ApiKey,
	ApiKeyExpiredError,
	ApiKeyInvalidError,
	ApiKeyStorageError,
} from "@morphdsl/auth-apikey-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

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
	"@morphdsl/ValidateApiKeyHandler",
);

export const ValidateApiKeyHandlerLive = Layer.succeed(ValidateApiKeyHandler, {
	handle: (params) => validateApiKey(params.key),
});
