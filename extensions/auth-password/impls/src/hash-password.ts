import type { PasswordHashError } from "@morphdsl/auth-password-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { hashPassword } from "./password";

export interface HashPasswordHandler {
	readonly handle: (
		params: { readonly password: string },
		options: Record<string, never>,
	) => Effect.Effect<string, PasswordHashError>;
}

export const HashPasswordHandler = Context.GenericTag<HashPasswordHandler>(
	"@morphdsl/HashPasswordHandler",
);

export const HashPasswordHandlerLive = Layer.succeed(HashPasswordHandler, {
	handle: (params, _options) => hashPassword(params.password),
});
