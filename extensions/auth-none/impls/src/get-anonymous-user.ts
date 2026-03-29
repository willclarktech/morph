import { Context, Effect, Layer } from "effect";

export interface GetAnonymousUserHandler {
	readonly handle: (params: object, options: object) => Effect.Effect<void>;
}

export const GetAnonymousUserHandler =
	Context.GenericTag<GetAnonymousUserHandler>("@morphdsl/GetAnonymousUserHandler");

export const GetAnonymousUserHandlerLive = Layer.succeed(
	GetAnonymousUserHandler,
	{
		handle: () => Effect.void,
	},
);
