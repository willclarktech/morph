// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Failed to access the event store JSON file
 */
export class FileAccessError extends Data.TaggedError("FileAccessError")<{
	readonly message: string;
	readonly path: string;
}> {}

/**
 * Union of all eventstoreJsonfile context errors.
 */
export type EventstoreJsonfileError = FileAccessError;
