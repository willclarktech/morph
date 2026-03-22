import { Context, Effect, Layer } from "effect";

import type { TokenExpiredError, TokenInvalidError } from "@morph/auth-jwt-dsl";
import { refreshToken } from "./jwt";

export interface RefreshTokenHandler {
	readonly handle: (
		params: { readonly token: string; readonly secret: string },
		options: object,
	) => Effect.Effect<string, TokenInvalidError | TokenExpiredError>;
}

export const RefreshTokenHandler = Context.GenericTag<RefreshTokenHandler>(
	"@morph/RefreshTokenHandler",
);

export const RefreshTokenHandlerLive = Layer.succeed(RefreshTokenHandler, {
	handle: (params) => refreshToken(params.token, params.secret),
});
