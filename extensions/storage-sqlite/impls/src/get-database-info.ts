import type { DatabaseInfo } from "@morphdsl/storage-sqlite-dsl";

import { DatabaseLockedError } from "@morphdsl/storage-sqlite-dsl";
import { Context, Effect, Layer } from "effect";
import { statSync } from "node:fs";

import { getDatabaseState } from "./database-state";

export interface GetDatabaseInfoHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<DatabaseInfo, DatabaseLockedError>;
}

export const GetDatabaseInfoHandler =
	Context.GenericTag<GetDatabaseInfoHandler>(
		"@morphdsl/GetDatabaseInfoHandler",
	);

export const GetDatabaseInfoHandlerLive = Layer.succeed(
	GetDatabaseInfoHandler,
	{
		handle: (_params, _options) =>
			Effect.try({
				try: () => {
					const state = getDatabaseState();
					const tableRow = state.db
						.query<
							{ count: number },
							[]
						>("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
						.get();
					const modeRow = state.db
						.query<{ journal_mode: string }, []>("PRAGMA journal_mode")
						.get();
					return {
						path: state.path,
						sizeBytes: statSync(state.path).size,
						tableCount: tableRow?.count ?? 0,
						journalMode: modeRow?.journal_mode ?? "unknown",
					} satisfies DatabaseInfo;
				},
				catch: (error) =>
					new DatabaseLockedError({
						path: "",
						message: String(error),
					}),
			}),
	},
);
