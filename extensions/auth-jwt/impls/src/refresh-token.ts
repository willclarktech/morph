import type { TokenExpiredError, TokenInvalidError } from "@morph/auth-jwt-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { refreshToken } from "./jwt";

export interface RefreshTokenHandler {
	readonly handle: (
		params: { readonly secret: string; readonly token: string },
		options: object,
	) => Effect.Effect<string, TokenInvalidError | TokenExpiredError>;
}

export const RefreshTokenHandler = Context.GenericTag<RefreshTokenHandler>(
	"@morph/RefreshTokenHandler",
);

export const RefreshTokenHandlerLive = Layer.succeed(RefreshTokenHandler, {
	handle: (params) => refreshToken(params.token, params.secret),
});
