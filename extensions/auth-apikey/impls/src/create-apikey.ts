import { Context, Effect, Layer } from "effect";

import type {
	ApiKeyStorageError,
	ApiKeyWithSecret,
} from "@morph/auth-apikey-dsl";
import { createApiKey } from "./apikey-store";

export interface CreateApiKeyHandler {
	readonly handle: (
		params: { readonly userId: string },
		options: {
			readonly name?: string | undefined;
			readonly expiresInSeconds?: number | undefined;
		},
	) => Effect.Effect<ApiKeyWithSecret, ApiKeyStorageError>;
}

export const CreateApiKeyHandler = Context.GenericTag<CreateApiKeyHandler>(
	"@morph/CreateApiKeyHandler",
);

export const CreateApiKeyHandlerLive = Layer.succeed(CreateApiKeyHandler, {
	handle: (params, options) =>
		createApiKey(params.userId, options.name, options.expiresInSeconds),
});
