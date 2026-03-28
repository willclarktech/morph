import type { PaginationParams, StorageTransport } from "@morph/storage-dsl";

import { applyPagination, StorageOperationError } from "@morph/storage-dsl";
import { jsonParse, jsonStringify } from "@morph/utils";
import { Effect } from "effect";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Create a JSON file-backed StorageTransport.
 * Reads/writes a JSON object at `filePath`, keyed by `collection`.
 * Suitable for CLI persistence and testing.
 */
export const createJsonFileTransport = (
	filePath: string,
	collection: string,
): StorageTransport => {
	const readStore = (): Record<string, string> => {
		try {
			const content = readFileSync(filePath, "utf8");
			const store = jsonParse(content) as Record<
				string,
				Record<string, string>
			>;
			return store[collection] ?? {};
		} catch {
			return {};
		}
	};

	const writeStore = (data: Record<string, string>): void => {
		let store: Record<string, Record<string, string>> = {};
		try {
			store = jsonParse(readFileSync(filePath, "utf8")) as Record<
				string,
				Record<string, string>
			>;
		} catch {
			// missing or corrupted file, overwrite
		}
		store[collection] = data;
		writeFileSync(filePath, jsonStringify(store));
	};

	return {
		get: (id) =>
			Effect.try({
				try: () => readStore()[id],
				catch: (error) =>
					new StorageOperationError({
						message: `JsonFile get failed: ${String(error)}`,
					}),
			}),
		getAll: (pagination?: PaginationParams) =>
			Effect.try({
				try: () => applyPagination(Object.values(readStore()), pagination),
				catch: (error) =>
					new StorageOperationError({
						message: `JsonFile getAll failed: ${String(error)}`,
					}),
			}),
		put: (id, data) =>
			Effect.try({
				try: () => {
					const store = readStore();
					store[id] = data;
					writeStore(store);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `JsonFile put failed: ${String(error)}`,
					}),
			}),
		remove: (id) =>
			Effect.try({
				try: () => {
					const store = readStore();
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- ID-keyed object deletion
					delete store[id];
					writeStore(store);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `JsonFile remove failed: ${String(error)}`,
					}),
			}),
	};
};
