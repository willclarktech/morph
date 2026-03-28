import type { FileStoreInfo } from "@morph/storage-jsonfile-dsl";

import { FileAccessError } from "@morph/storage-jsonfile-dsl";
import { Context, Effect, Layer } from "effect";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface OpenFileStoreHandler {
	readonly handle: (
		params: { readonly path: string },
		options: Record<string, never>,
	) => Effect.Effect<FileStoreInfo, FileAccessError>;
}

export const OpenFileStoreHandler = Context.GenericTag<OpenFileStoreHandler>(
	"@morph/OpenFileStoreHandler",
);

export const OpenFileStoreHandlerLive = Layer.succeed(OpenFileStoreHandler, {
	handle: (params, _options) =>
		Effect.try({
			try: () => {
				const filePath = path.resolve(params.path);
				if (!existsSync(filePath)) {
					writeFileSync(filePath, "{}");
				}
				const content = readFileSync(filePath, "utf8");
				let store: Record<string, Record<string, string>> = {};
				try {
					store = JSON.parse(content) as Record<string, Record<string, string>>;
				} catch {
					// File exists but is empty or invalid — start fresh
					store = {};
					writeFileSync(filePath, "{}");
				}
				let entryCount = 0;
				for (const collection of Object.values(store)) {
					entryCount += Object.keys(collection).length;
				}
				return {
					path: filePath,
					sizeBytes: statSync(filePath).size,
					collectionCount: Object.keys(store).length,
					entryCount,
				} satisfies FileStoreInfo;
			},
			catch: (error) =>
				new FileAccessError({
					path: params.path,
					message: String(error),
				}),
		}),
});
