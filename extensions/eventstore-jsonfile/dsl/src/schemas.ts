// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Statistics about the JSON file event store
export const FileEventStoreInfoSchema = S.Struct({
	eventCount: S.Number,
	path: S.String,
	sizeBytes: S.Number,
});

export type FileEventStoreInfo = S.Schema.Type<typeof FileEventStoreInfoSchema>;

export const parseFileEventStoreInfo = S.decodeUnknownSync(
	FileEventStoreInfoSchema,
);
export const parseFileEventStoreInfoEither = S.decodeUnknownEither(
	FileEventStoreInfoSchema,
);
export const encodeFileEventStoreInfo = S.encodeSync(FileEventStoreInfoSchema);

// Function Schemas (pure transformations)

// Get current statistics about the JSON file event store
export const GetFileStoreInfoInputSchema = S.Struct({});

export type GetFileStoreInfoInput = S.Schema.Type<
	typeof GetFileStoreInfoInputSchema
>;
export type GetFileStoreInfoOutput = FileEventStoreInfo;
