import type { Database } from "bun:sqlite";

let currentDatabase: Database | undefined;
let currentPath = "";

export const getDatabaseState = (): { db: Database; path: string } => {
	if (!currentDatabase) {
		throw new Error(
			"SQLite database not initialized. Call initializeDatabase first.",
		);
	}
	return { db: currentDatabase, path: currentPath };
};

export const setDatabaseState = (database: Database, path: string): void => {
	currentDatabase = database;
	currentPath = path;
};
