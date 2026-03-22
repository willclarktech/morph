import type { PasswordHashError } from "@morph/auth-password-dsl";
import type { Effect } from "effect";

import { hashPassword } from "./password";
import { Context, Layer } from "effect";

export interface HashPasswordHandler {
	readonly handle: (
		params: { readonly password: string },
		options: Record<string, never>,
	) => Effect.Effect<string, PasswordHashError>;
}

export const HashPasswordHandler = Context.GenericTag<HashPasswordHandler>(
	"@morph/HashPasswordHandler",
);

export const HashPasswordHandlerLive = Layer.succeed(HashPasswordHandler, {
	handle: (params, _options) => hashPassword(params.password),
});
