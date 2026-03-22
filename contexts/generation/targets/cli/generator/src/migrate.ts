import { Database } from "bun:sqlite";
import { Effect } from "effect";
import { Glob } from "bun";

interface MigrationModule {
	readonly up: (db: Database) => void;
	readonly down?: (db: Database) => void;
}

interface MigrationStatus {
	readonly version: string;
	readonly appliedAt: string | undefined;
}

interface MigrationRunner {
	readonly up: () => readonly string[];
	readonly down: () => string | undefined;
	readonly status: () => readonly MigrationStatus[];
}

const TRACKING_TABLE = "_migrations";

const ensureTrackingTable = (db: Database): void => {
	db.run(`
		CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		) STRICT
	`);
};

const getApplied = (db: Database): ReadonlySet<string> => {
	ensureTrackingTable(db);
	const rows = db
		.query<{ version: string }, []>(`SELECT version FROM ${TRACKING_TABLE}`)
		.all();
	return new Set(rows.map((r) => r.version));
};

const resolveSqlitePath = (envPrefix: string): string =>
	process.env[`${envPrefix}_SQLITE_PATH`] ??
	`.${envPrefix.toLowerCase().replaceAll("_", "-")}.db`;

const loadMigrations = async (
	migrationsDir: string,
): Promise<Record<string, MigrationModule>> => {
	const glob = new Glob("*.ts");
	const files = [...glob.scanSync(migrationsDir)].sort();
	const migrations: Record<string, MigrationModule> = {};
	for (const file of files) {
		const version = file.replace(/\.ts$/, "");
		const mod = (await import(`${migrationsDir}/${file}`)) as MigrationModule;
		migrations[version] = mod;
	}
	return migrations;
};

export const runMigrateCli = (
	argv: readonly string[],
	envPrefix: string,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		const subcommand = argv[0] ?? "status";
		const dbPath = resolveSqlitePath(envPrefix);
		const migrationsDir = `${process.cwd()}/migrations`;

		const db = new Database(dbPath);
		const migrations = yield* Effect.promise(() =>
			loadMigrations(migrationsDir),
		);
		const runner = createMigrationRunner(db, migrations);

		switch (subcommand) {
			case "up": {
				const applied = runner.up();
				if (applied.length === 0) {
					console.info("No pending migrations.");
				} else {
					for (const v of applied) console.info(`Applied: ${v}`);
					console.info(`${applied.length} migration(s) applied.`);
				}
				break;
			}
			case "down": {
				const reverted = runner.down();
				if (reverted) {
					console.info(`Reverted: ${reverted}`);
				} else {
					console.info("No migrations to revert.");
				}
				break;
			}
			case "status": {
				const statuses = runner.status();
				if (statuses.length === 0) {
					console.info("No migrations found.");
				} else {
					for (const s of statuses) {
						const status = s.appliedAt ? `applied ${s.appliedAt}` : "pending";
						console.info(`  ${s.version}: ${status}`);
					}
				}
				break;
			}
			default: {
				console.error(
					`Unknown migrate subcommand: ${subcommand}. Use up, down, or status.`,
				);
			}
		}

		db.close();
	});

export const createMigrationRunner = (
	db: Database,
	migrations: Record<string, MigrationModule>,
): MigrationRunner => {
	const sortedVersions = Object.keys(migrations).sort();

	return {
		up: () => {
			const applied = getApplied(db);
			const pending = sortedVersions.filter((v) => !applied.has(v));
			for (const version of pending) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered from sortedVersions
				const migration = migrations[version]!;
				db.transaction(() => {
					migration.up(db);
					db.run(
						`INSERT INTO ${TRACKING_TABLE} (version, applied_at) VALUES (?, ?)`,
						[version, new Date().toISOString()],
					);
				})();
			}
			return pending;
		},

		down: () => {
			const applied = getApplied(db);
			const lastApplied = [...sortedVersions]
				.reverse()
				.find((v) => applied.has(v));
			if (!lastApplied) return undefined;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- found via find()
			const migration = migrations[lastApplied]!;
			if (!migration.down) {
				throw new Error(`Migration ${lastApplied} has no down function`);
			}
			db.transaction(() => {
				migration.down!(db);
				db.run(`DELETE FROM ${TRACKING_TABLE} WHERE version = ?`, [
					lastApplied,
				]);
			})();
			return lastApplied;
		},

		status: () => {
			ensureTrackingTable(db);
			const rows = db
				.query<
					{ version: string; applied_at: string },
					[]
				>(`SELECT version, applied_at FROM ${TRACKING_TABLE} ORDER BY version`)
				.all();
			const appliedMap = new Map(rows.map((r) => [r.version, r.applied_at]));

			return sortedVersions.map((version) => ({
				version,
				appliedAt: appliedMap.get(version),
			}));
		},
	};
};
