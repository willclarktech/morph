import { Context, Effect, Layer } from "effect";

import type { Session, SessionStorageError } from "@morph/auth-session-dsl";
import { createSession } from "./session-store";

export interface CreateSessionHandler {
	readonly handle: (
		params: { readonly userId: string },
		options: {
			readonly data?: unknown | undefined;
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
