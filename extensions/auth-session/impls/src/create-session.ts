import type { Session, SessionStorageError } from "@morph/auth-session-dsl";
import type { Effect } from "effect";

import { Context, Layer } from "effect";

import { createSession } from "./session-store";

export interface CreateSessionHandler {
	readonly handle: (
		params: { readonly userId: string },
		options: {
			readonly data?: unknown;
			readonly expiresInSeconds?: number | undefined;
		},
	) => Effect.Effect<Session, SessionStorageError>;
}

export const CreateSessionHandler = Context.GenericTag<CreateSessionHandler>(
	"@morph/CreateSessionHandler",
);

export const CreateSessionHandlerLive = Layer.succeed(CreateSessionHandler, {
	handle: (params, options) =>
		createSession(params.userId, options.data, options.expiresInSeconds),
});
