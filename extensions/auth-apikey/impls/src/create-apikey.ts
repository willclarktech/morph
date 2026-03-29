import type {
	ApiKeyStorageError,
	ApiKeyWithSecret,
} from "@morphdsl/auth-apikey-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { createApiKey } from "./apikey-store";

export interface CreateApiKeyHandler {
	readonly handle: (
		params: { readonly userId: string },
		options: {
			readonly expiresInSeconds?: number | undefined;
			readonly name?: string | undefined;
		},
	) => Effect.Effect<ApiKeyWithSecret, ApiKeyStorageError>;
}

export const CreateApiKeyHandler = Context.GenericTag<CreateApiKeyHandler>(
	"@morphdsl/CreateApiKeyHandler",
);

export const CreateApiKeyHandlerLive = Layer.succeed(CreateApiKeyHandler, {
	handle: (params, options) =>
		createApiKey(params.userId, options.name, options.expiresInSeconds),
});
