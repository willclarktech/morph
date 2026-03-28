// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Statistics about the JSON file store
export const FileStoreInfoSchema = S.Struct({
	path: S.String,
	sizeBytes: S.Number,
	collectionCount: S.Number,
	entryCount: S.Number,
});

export type FileStoreInfo = S.Schema.Type<typeof FileStoreInfoSchema>;

export const parseFileStoreInfo = S.decodeUnknownSync(FileStoreInfoSchema);
export const parseFileStoreInfoEither =
	S.decodeUnknownEither(FileStoreInfoSchema);
export const encodeFileStoreInfo = S.encodeSync(FileStoreInfoSchema);

// Function Schemas (pure transformations)

import type { FileAccessError, FileCorruptedError } from "./errors";

// Open or create a JSON file store at the given path
export const OpenFileStoreInputSchema = S.Struct({
	path: S.String,
});

export type OpenFileStoreInput = S.Schema.Type<typeof OpenFileStoreInputSchema>;
export type OpenFileStoreOutput = FileStoreInfo;
export type OpenFileStoreError = FileAccessError;

// Get current statistics about the JSON file store
export const GetFileStoreInfoInputSchema = S.Struct({});

export type GetFileStoreInfoInput = S.Schema.Type<
	typeof GetFileStoreInfoInputSchema
>;
export type GetFileStoreInfoOutput = FileStoreInfo;
export type GetFileStoreInfoError = FileAccessError | FileCorruptedError;

// Rewrite the JSON file without fragmentation
export const CompactFileInputSchema = S.Struct({});

export type CompactFileInput = S.Schema.Type<typeof CompactFileInputSchema>;
export type CompactFileOutput = FileStoreInfo;
export type CompactFileError = FileAccessError | FileCorruptedError;
