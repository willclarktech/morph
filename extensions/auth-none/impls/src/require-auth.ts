import { NoAuthEnabledError } from "@morph/auth-none-dsl";
import { Context, Effect, Layer } from "effect";

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
