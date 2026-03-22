import { Layer } from "effect";

import { CreateApiKeyHandlerLive } from "./create-apikey";
import { ValidateApiKeyHandlerLive } from "./validate-apikey";
import { RevokeApiKeyHandlerLive } from "./revoke-apikey";

/**
 * Combined layer for all auth-apikey handlers.
 */
export const HandlersLayer = Layer.mergeAll(
	CreateApiKeyHandlerLive,
	ValidateApiKeyHandlerLive,
	RevokeApiKeyHandlerLive,
);
