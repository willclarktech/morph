import { Layer } from "effect";

import { RefreshTokenHandlerLive } from "./refresh-token";
import { SignTokenHandlerLive } from "./sign-token";
import { VerifyTokenHandlerLive } from "./verify-token";

/**
 * Combined layer for all auth-jwt handlers.
 */
export const HandlersLayer = Layer.mergeAll(
	SignTokenHandlerLive,
	VerifyTokenHandlerLive,
	RefreshTokenHandlerLive,
);
