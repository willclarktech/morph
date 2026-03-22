import { Layer } from "effect";

import { ConnectHandlerLive } from "./connect";
import { GetConnectionInfoHandlerLive } from "./get-connection-info";

export const HandlersLayer = Layer.mergeAll(
	ConnectHandlerLive,
	GetConnectionInfoHandlerLive,
);
