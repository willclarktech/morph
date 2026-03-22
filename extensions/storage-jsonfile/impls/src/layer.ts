import { Layer } from "effect";

import { CompactFileHandlerLive } from "./compact-file";
import { GetFileStoreInfoHandlerLive } from "./get-file-store-info";
import { OpenFileStoreHandlerLive } from "./open-file-store";

export const HandlersLayer = Layer.mergeAll(
	OpenFileStoreHandlerLive,
	GetFileStoreInfoHandlerLive,
	CompactFileHandlerLive,
);
