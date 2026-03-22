import { Context, Effect, Layer } from "effect";

import { NoAuthEnabledError } from "@morph/auth-none-dsl";

export interface RequireAuthHandler {
	readonly handle: (
		params: object,
		options: object,
	) => Effect.Effect<void, NoAuthEnabledError>;
}

export const RequireAuthHandler = Context.GenericTag<RequireAuthHandler>(
	"@morph/RequireAuthHandler",
);

export const RequireAuthHandlerLive = Layer.succeed(RequireAuthHandler, {
	handle: () =>
		Effect.fail(
			new NoAuthEnabledError({
				message: "Authentication is not configured for this endpoint",
			}),
		),
});
