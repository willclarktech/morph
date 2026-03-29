import type {
	FileAccessError,
	FileCorruptedError,
	FileStoreInfo,
} from "@morphdsl/storage-jsonfile-dsl";

import { Context, Effect, Layer } from "effect";

import { getFileStorePath } from "./file-store-state";
import {
	getFileInfo,
	readStoreFile,
	writeStoreFile,
} from "./file-store-utilities";

export interface CompactFileHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<FileStoreInfo, FileAccessError | FileCorruptedError>;
}

export const CompactFileHandler = Context.GenericTag<CompactFileHandler>(
	"@morphdsl/CompactFileHandler",
);

export const CompactFileHandlerLive = Layer.succeed(CompactFileHandler, {
	handle: (_params, _options) =>
		Effect.gen(function* () {
			const filePath = getFileStorePath();
			const store = yield* readStoreFile(filePath);
			yield* writeStoreFile(filePath, store);
			return getFileInfo(filePath, store);
		}),
});
