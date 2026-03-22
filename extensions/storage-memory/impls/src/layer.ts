import { Layer } from "effect";

import { GetStoreInfoHandlerLive } from "./get-store-info";
import { ResetStoreHandlerLive } from "./reset-store";

export const HandlersLayer = Layer.mergeAll(
	GetStoreInfoHandlerLive,
	ResetStoreHandlerLive,
);
