import type {
	Session,
	SessionExpiredError,
	SessionNotFoundError,
	SessionStorageError,
} from "@morphdsl/auth-session-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { validateSession } from "./session-store";

export interface ValidateSessionHandler {
	readonly handle: (
		params: { readonly sessionId: string },
		options: Record<string, never>,
	) => Effect.Effect<
		Session,
		SessionNotFoundError | SessionExpiredError | SessionStorageError
	>;
}

export const ValidateSessionHandler =
	Context.GenericTag<ValidateSessionHandler>("@morphdsl/ValidateSessionHandler");

export const ValidateSessionHandlerLive = Layer.succeed(
	ValidateSessionHandler,
	{
		handle: (params, _options) => validateSession(params.sessionId),
	},
);
