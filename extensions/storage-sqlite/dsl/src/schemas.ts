// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// Statistics about the SQLite database
export const DatabaseInfoSchema = S.Struct({
	path: S.String,
	sizeBytes: S.Number,
	tableCount: S.Number,
	journalMode: S.String,
});

export type DatabaseInfo = S.Schema.Type<typeof DatabaseInfoSchema>;

export const parseDatabaseInfo = S.decodeUnknownSync(DatabaseInfoSchema);
export const parseDatabaseInfoEither =
	S.decodeUnknownEither(DatabaseInfoSchema);
export const encodeDatabaseInfo = S.encodeSync(DatabaseInfoSchema);

// Function Schemas (pure transformations)

import { DatabaseLockedError, MigrationFailedError } from "./errors";

// Create tables and set pragmas for a SQLite database
export const InitializeDatabaseInputSchema = S.Struct({
	path: S.String,
});

export type InitializeDatabaseInput = S.Schema.Type<
	typeof InitializeDatabaseInputSchema
>;
export type InitializeDatabaseOutput = DatabaseInfo;
export type InitializeDatabaseError =
	| DatabaseLockedError
	| MigrationFailedError;

// Get current statistics about the SQLite database
export const GetDatabaseInfoInputSchema = S.Struct({});

export type GetDatabaseInfoInput = S.Schema.Type<
	typeof GetDatabaseInfoInputSchema
>;
export type GetDatabaseInfoOutput = DatabaseInfo;
export type GetDatabaseInfoError = DatabaseLockedError;
