import { Layer } from "effect";

import { SignTokenHandlerLive } from "./sign-token";
import { VerifyTokenHandlerLive } from "./verify-token";
import { RefreshTokenHandlerLive } from "./refresh-token";

/**
 * Combined layer for all auth-jwt handlers.
 */
export const HandlersLayer = Layer.mergeAll(
	SignTokenHandlerLive,
	VerifyTokenHandlerLive,
	RefreshTokenHandlerLive,
);
