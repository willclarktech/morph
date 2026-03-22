/**
 * Effect Layer compositions for auth-session.
 */
import { Layer } from "effect";

import { CreateSessionHandlerLive } from "./create-session";
import { DestroySessionHandlerLive } from "./destroy-session";
import { ValidateSessionHandlerLive } from "./validate-session";

/**
 * Combined handlers layer with default in-memory session store.
 */
export const HandlersLayer = Layer.mergeAll(
	CreateSessionHandlerLive,
	ValidateSessionHandlerLive,
	DestroySessionHandlerLive,
);

// Re-export session store utilities for custom configurations
export {
	createFileSessionStore,
	resetSessionStore,
	setSessionStore,
	type SessionStore,
} from "./session-store";
