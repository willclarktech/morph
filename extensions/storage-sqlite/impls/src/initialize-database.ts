import type { DatabaseInfo } from "@morphdsl/storage-sqlite-dsl";

import {
	DatabaseLockedError,
	MigrationFailedError,
} from "@morphdsl/storage-sqlite-dsl";
import { Database } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { statSync } from "node:fs";
import path from "node:path";

export interface InitializeDatabaseHandler {
	readonly handle: (
		params: { readonly path: string },
		options: Record<string, never>,
	) => Effect.Effect<DatabaseInfo, DatabaseLockedError | MigrationFailedError>;
}

export const InitializeDatabaseHandler =
	Context.GenericTag<InitializeDatabaseHandler>(
		"@morphdsl/InitializeDatabaseHandler",
	);

const getTableCount = (database: Database): number => {
	const row = database
		.query<
			{ count: number },
			[]
		>("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
		.get();
	return row?.count ?? 0;
};

const getJournalMode = (database: Database): string => {
	const row = database
		.query<{ journal_mode: string }, []>("PRAGMA journal_mode")
		.get();
	return row?.journal_mode ?? "unknown";
};

export const InitializeDatabaseHandlerLive = Layer.succeed(
	InitializeDatabaseHandler,
	{
		handle: (params, _options) =>
			Effect.gen(function* () {
				const databasePath = path.resolve(params.path);

				const database = yield* Effect.try({
					try: () => new Database(databasePath, { create: true, strict: true }),
					catch: (error) =>
						new DatabaseLockedError({
							path: databasePath,
							message: String(error),
						}),
				});

				yield* Effect.try({
					try: () => {
						database.run("PRAGMA journal_mode = WAL;");
					},
					catch: (error) =>
						new MigrationFailedError({
							message: String(error),
							table: "_pragma",
						}),
				});

				const sizeBytes = yield* Effect.try({
					try: () => statSync(databasePath).size,
					catch: () =>
						new DatabaseLockedError({
							path: databasePath,
							message: "Cannot stat database file",
						}),
				});

				return {
					path: databasePath,
					sizeBytes,
					tableCount: getTableCount(database),
					journalMode: getJournalMode(database),
				} satisfies DatabaseInfo;
			}),
	},
);
