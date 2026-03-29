import type { JwtPayload } from "@morphdsl/auth-jwt-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { signToken } from "./jwt";

export interface SignTokenHandler {
	readonly handle: (
		params: { readonly payload: JwtPayload; readonly secret: string },
		options: object,
	) => Effect.Effect<string>;
}

export const SignTokenHandler = Context.GenericTag<SignTokenHandler>(
	"@morphdsl/SignTokenHandler",
);

export const SignTokenHandlerLive = Layer.succeed(SignTokenHandler, {
	handle: (params) => signToken(params.payload, params.secret),
});
