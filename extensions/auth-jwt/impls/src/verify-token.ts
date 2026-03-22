import { Context, Effect, Layer } from "effect";

import type {
	JwtPayload,
	TokenExpiredError,
	TokenInvalidError,
} from "@morph/auth-jwt-dsl";
import { verifyToken } from "./jwt";

export interface VerifyTokenHandler {
	readonly handle: (
		params: { readonly token: string; readonly secret: string },
		options: object,
	) => Effect.Effect<JwtPayload, TokenInvalidError | TokenExpiredError>;
}

export const VerifyTokenHandler = Context.GenericTag<VerifyTokenHandler>(
	"@morph/VerifyTokenHandler",
);

export const VerifyTokenHandlerLive = Layer.succeed(VerifyTokenHandler, {
	handle: (params) => verifyToken(params.token, params.secret),
});
