import type { Database } from "bun:sqlite";

let currentDb: Database | undefined;
let currentPath = "";

export const getDatabaseState = (): { db: Database; path: string } => {
	if (!currentDb) {
		throw new Error(
			"SQLite database not initialized. Call initializeDatabase first.",
		);
	}
	return { db: currentDb, path: currentPath };
};

export const setDatabaseState = (db: Database, path: string): void => {
	currentDb = db;
	currentPath = path;
};
