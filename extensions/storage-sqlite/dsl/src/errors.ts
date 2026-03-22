// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

/**
 * Database is locked by another process
 */
export class DatabaseLockedError extends Data.TaggedError(
	"DatabaseLockedError",
)<{
	readonly path: string;
	readonly message: string;
}> {}

/**
 * Database schema setup or migration failed
 */
export class MigrationFailedError extends Data.TaggedError(
	"MigrationFailedError",
)<{
	readonly message: string;
	readonly table: string;
}> {}

/**
 * Union of all storageSqlite context errors.
 */
export type StorageSqliteError = DatabaseLockedError | MigrationFailedError;
