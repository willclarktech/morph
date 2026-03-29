import type { PaginationParams, StorageTransport } from "@morphdsl/storage-dsl";

import {
	applyPagination,
	StorageConnectionError,
	StorageOperationError,
} from "@morphdsl/storage-dsl";
import { Database } from "bun:sqlite";
import { Effect } from "effect";

import { quoteId } from "./field-flattening";

/**
 * Open a SQLite database with WAL mode.
 * Returns the Database handle or fails with StorageConnectionError.
 */
export const openSqliteDatabase = (
	path: string,
): Effect.Effect<Database, StorageConnectionError> =>
	Effect.try({
		try: () => {
			const database = new Database(path, { create: true, strict: true });
			database.run("PRAGMA journal_mode = WAL;");
			return database;
		},
		catch: (error) =>
			new StorageConnectionError({
				message: `Failed to open SQLite database at ${path}: ${String(error)}`,
			}),
	});

/**
 * Create a SQLite-backed StorageTransport.
 * Auto-creates the table if it doesn't exist.
 */
export const createSqliteTransport = (
	database: Database,
	tableName: string,
): StorageTransport => {
	const qt = quoteId(tableName);
	database.run(
		`CREATE TABLE IF NOT EXISTS ${qt} (${quoteId("id")} TEXT PRIMARY KEY, ${quoteId("data")} TEXT NOT NULL)`,
	);

	const findById = database.query<{ data: string }, [string]>(
		`SELECT ${quoteId("data")} FROM ${qt} WHERE ${quoteId("id")} = ?`,
	);
	const findAll = database.query<{ data: string }, []>(
		`SELECT ${quoteId("data")} FROM ${qt}`,
	);
	const upsert = database.query(
		`INSERT OR REPLACE INTO ${qt} (${quoteId("id")}, ${quoteId("data")}) VALUES (?, ?)`,
	);
	const deleteById = database.query(
		`DELETE FROM ${qt} WHERE ${quoteId("id")} = ?`,
	);

	return {
		get: (id) =>
			Effect.try({
				try: () => findById.get(id)?.data,
				catch: (error) =>
					new StorageOperationError({
						message: `SQLite get failed: ${String(error)}`,
					}),
			}),
		getAll: (pagination?: PaginationParams) =>
			Effect.try({
				try: () =>
					applyPagination(
						findAll.all().map((row) => row.data),
						pagination,
					),
				catch: (error) =>
					new StorageOperationError({
						message: `SQLite getAll failed: ${String(error)}`,
					}),
			}),
		put: (id, data) =>
			Effect.try({
				try: () => {
					upsert.run(id, data);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `SQLite put failed: ${String(error)}`,
					}),
			}),
		remove: (id) =>
			Effect.try({
				try: () => {
					deleteById.run(id);
				},
				catch: (error) =>
					new StorageOperationError({
						message: `SQLite remove failed: ${String(error)}`,
					}),
			}),
	};
};
