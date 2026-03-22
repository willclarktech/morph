// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Storage operation failed
 */
export class StorageOperationError extends Data.TaggedError(
	"StorageOperationError",
)<{
	readonly message: string;
}> {}

/**
 * Failed to connect to storage backend
 */
export class StorageConnectionError extends Data.TaggedError(
	"StorageConnectionError",
)<{
	readonly message: string;
}> {}

/**
 * Union of all storage context errors.
 */
export type StorageError = StorageConnectionError | StorageOperationError;
