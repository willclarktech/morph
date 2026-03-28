// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to access the JSON file (permission or lock failure)
 */
export class FileAccessError extends Data.TaggedError("FileAccessError")<{
	readonly message: string;
	readonly path: string;
}> {}

/**
 * JSON file contains invalid or corrupted data
 */
export class FileCorruptedError extends Data.TaggedError("FileCorruptedError")<{
	readonly message: string;
	readonly path: string;
}> {}

/**
 * Union of all storageJsonfile context errors.
 */
export type StorageJsonfileError = FileAccessError | FileCorruptedError;
