import type {
	JwtPayload,
	TokenExpiredError,
	TokenInvalidError,
} from "@morphdsl/auth-jwt-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { verifyToken } from "./jwt";

export interface VerifyTokenHandler {
	readonly handle: (
		params: { readonly secret: string; readonly token: string },
		options: object,
	) => Effect.Effect<JwtPayload, TokenInvalidError | TokenExpiredError>;
}

export const VerifyTokenHandler = Context.GenericTag<VerifyTokenHandler>(
	"@morphdsl/VerifyTokenHandler",
);

export const VerifyTokenHandlerLive = Layer.succeed(VerifyTokenHandler, {
	handle: (params) => verifyToken(params.token, params.secret),
});
