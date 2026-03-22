import { Layer } from "effect";

import { GetDatabaseInfoHandlerLive } from "./get-database-info";
import { InitializeDatabaseHandlerLive } from "./initialize-database";

export const HandlersLayer = Layer.mergeAll(
	InitializeDatabaseHandlerLive,
	GetDatabaseInfoHandlerLive,
);
