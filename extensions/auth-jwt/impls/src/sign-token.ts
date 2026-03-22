import { Context, Effect, Layer } from "effect";

import type { JwtPayload } from "@morph/auth-jwt-dsl";
import { signToken } from "./jwt";

export interface SignTokenHandler {
	readonly handle: (
		params: { readonly payload: JwtPayload; readonly secret: string },
		options: object,
	) => Effect.Effect<string, never>;
}

export const SignTokenHandler = Context.GenericTag<SignTokenHandler>(
	"@morph/SignTokenHandler",
);

export const SignTokenHandlerLive = Layer.succeed(SignTokenHandler, {
	handle: (params) => signToken(params.payload, params.secret),
});
