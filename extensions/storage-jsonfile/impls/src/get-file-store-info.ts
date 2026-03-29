import type {
	FileAccessError,
	FileCorruptedError,
	FileStoreInfo,
} from "@morphdsl/storage-jsonfile-dsl";

import { Context, Effect, Layer } from "effect";

import { getFileStorePath } from "./file-store-state";
import { getFileInfo, readStoreFile } from "./file-store-utilities";

export interface GetFileStoreInfoHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<FileStoreInfo, FileAccessError | FileCorruptedError>;
}

export const GetFileStoreInfoHandler =
	Context.GenericTag<GetFileStoreInfoHandler>(
		"@morphdsl/GetFileStoreInfoHandler",
	);

export const GetFileStoreInfoHandlerLive = Layer.succeed(
	GetFileStoreInfoHandler,
	{
		handle: (_params, _options) =>
			Effect.gen(function* () {
				const filePath = getFileStorePath();
				const store = yield* readStoreFile(filePath);
				return getFileInfo(filePath, store);
			}),
	},
);
