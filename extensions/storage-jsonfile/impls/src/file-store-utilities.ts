import type { FileStoreInfo } from "@morphdsl/storage-jsonfile-dsl";

import {
	FileAccessError,
	FileCorruptedError,
} from "@morphdsl/storage-jsonfile-dsl";
import { jsonParse, jsonStringify } from "@morphdsl/utils";
import { Effect } from "effect";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type StoreData = Record<string, Record<string, string>>;

export const readStoreFile = (
	filePath: string,
): Effect.Effect<StoreData, FileAccessError | FileCorruptedError> =>
	Effect.gen(function* () {
		if (!existsSync(filePath)) return {};
		const content = yield* Effect.try({
			try: () => readFileSync(filePath, "utf8"),
			catch: (error) =>
				new FileAccessError({
					path: filePath,
					message: String(error),
				}),
		});
		return yield* Effect.try({
			try: () => jsonParse(content) as StoreData,
			catch: (error) =>
				new FileCorruptedError({
					path: filePath,
					message: String(error),
				}),
		});
	});

export const getFileInfo = (
	filePath: string,
	store: StoreData,
): FileStoreInfo => {
	let entryCount = 0;
	for (const collection of Object.values(store)) {
		entryCount += Object.keys(collection).length;
	}
	let sizeBytes = 0;
	try {
		sizeBytes = statSync(filePath).size;
	} catch {
		// file doesn't exist yet
	}
	return {
		path: path.resolve(filePath),
		sizeBytes,
		collectionCount: Object.keys(store).length,
		entryCount,
	};
};

export const writeStoreFile = (
	filePath: string,
	store: StoreData,
): Effect.Effect<void, FileAccessError> =>
	Effect.try({
		try: () => writeFileSync(filePath, jsonStringify(store)),
		catch: (error) =>
			new FileAccessError({
				path: filePath,
				message: String(error),
			}),
	});
