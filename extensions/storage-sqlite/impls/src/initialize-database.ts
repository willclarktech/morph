import { Database } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { statSync } from "node:fs";
import path from "node:path";

import type { DatabaseInfo } from "@morph/storage-sqlite-dsl";

import {
	DatabaseLockedError,
	MigrationFailedError,
} from "@morph/storage-sqlite-dsl";

export interface InitializeDatabaseHandler {
	readonly handle: (
		params: { readonly path: string },
		options: Record<string, never>,
	) => Effect.Effect<DatabaseInfo, DatabaseLockedError | MigrationFailedError>;
}

export const InitializeDatabaseHandler =
	Context.GenericTag<InitializeDatabaseHandler>(
		"@morph/InitializeDatabaseHandler",
	);

const getTableCount = (db: Database): number => {
	const row = db
		.query<
			{ count: number },
			[]
		>("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
		.get();
	return row?.count ?? 0;
};

const getJournalMode = (db: Database): string => {
	const row = db
		.query<{ journal_mode: string }, []>("PRAGMA journal_mode")
		.get();
	return row?.journal_mode ?? "unknown";
};

export const InitializeDatabaseHandlerLive = Layer.succeed(
	InitializeDatabaseHandler,
	{
		handle: (params, _options) =>
			Effect.gen(function* () {
				const dbPath = path.resolve(params.path);

				const db = yield* Effect.try({
					try: () => new Database(dbPath, { create: true, strict: true }),
					catch: (error) =>
						new DatabaseLockedError({
							path: dbPath,
							message: String(error),
						}),
				});

				yield* Effect.try({
					try: () => {
						db.run("PRAGMA journal_mode = WAL;");
					},
					catch: (error) =>
						new MigrationFailedError({
							message: String(error),
							table: "_pragma",
						}),
				});

				const sizeBytes = yield* Effect.try({
					try: () => statSync(dbPath).size,
					catch: () =>
						new DatabaseLockedError({
							path: dbPath,
							message: "Cannot stat database file",
						}),
				});

				return {
					path: dbPath,
					sizeBytes,
					tableCount: getTableCount(db),
					journalMode: getJournalMode(db),
				} satisfies DatabaseInfo;
			}),
	},
);
