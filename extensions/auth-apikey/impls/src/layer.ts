import { Layer } from "effect";

import { CreateApiKeyHandlerLive } from "./create-apikey";
import { RevokeApiKeyHandlerLive } from "./revoke-apikey";
import { ValidateApiKeyHandlerLive } from "./validate-apikey";

/**
 * Combined layer for all auth-apikey handlers.
 */
export const HandlersLayer = Layer.mergeAll(
	CreateApiKeyHandlerLive,
	ValidateApiKeyHandlerLive,
	RevokeApiKeyHandlerLive,
);
