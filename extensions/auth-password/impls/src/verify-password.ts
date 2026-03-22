import type { PasswordVerifyError } from "@morph/auth-password-dsl";
import type { Effect } from "effect";

import { verifyPassword } from "./password";
import { Context, Layer } from "effect";

export interface VerifyPasswordHandler {
	readonly handle: (
		params: { readonly password: string; readonly hash: string },
		options: Record<string, never>,
	) => Effect.Effect<boolean, PasswordVerifyError>;
}

export const VerifyPasswordHandler = Context.GenericTag<VerifyPasswordHandler>(
	"@morph/VerifyPasswordHandler",
);

export const VerifyPasswordHandlerLive = Layer.succeed(VerifyPasswordHandler, {
	handle: (params, _options) => verifyPassword(params.password, params.hash),
});
