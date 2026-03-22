import { Layer } from "effect";

import { GetAnonymousUserHandlerLive } from "./get-anonymous-user";
import { RequireAuthHandlerLive } from "./require-auth";

/**
 * Combined layer for all auth-none handlers.
 */
export const HandlersLayer = Layer.mergeAll(
	GetAnonymousUserHandlerLive,
	RequireAuthHandlerLive,
);
