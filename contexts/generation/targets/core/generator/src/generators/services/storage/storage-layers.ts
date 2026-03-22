/**
 * Storage layers generator.
 * Generates layer composition functions that wire transports to repository adapters.
 */

import type {
	EntityDef,
	GeneratedFile,
	StorageBackend,
} from "@morph/domain-schema";

import { indent, sep, toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Aggregate root entry with name and entity definition.
 */
interface AggregateRootEntry {
	readonly name: string;
	readonly def: EntityDef;
}

/**
 * Generate the storage-layers file that composes transports via the functor.
 */
export const generateStorageLayers = (
	aggregateRootEntries: readonly AggregateRootEntry[],
	storageBackends: readonly StorageBackend[],
	envPrefix: string,
): GeneratedFile => {
	const hasMemory = storageBackends.includes("memory");
	const hasJsonFile = storageBackends.includes("jsonfile");
	const hasSqlite = storageBackends.includes("sqlite");
	const hasRedis = storageBackends.includes("redis");
	const hasEventsourced = storageBackends.includes("eventsourced");

	const needsEntityStore =
		hasMemory || hasJsonFile || hasRedis || hasEventsourced;

	// Build imports
	const imports: string[] = ['import { Effect, Layer } from "effect";', ""];

	if (needsEntityStore) {
		imports.push('import { createEntityStore } from "@morph/storage-impls";');
	}

	if (hasMemory) {
		imports.push(
			'import { createMemoryTransport } from "@morph/storage-memory-impls";',
		);
	}
	if (hasJsonFile) {
		imports.push(
			'import { createJsonFileTransport } from "@morph/storage-jsonfile-impls";',
		);
	}
	if (hasSqlite) {
		imports.push(
			'import { createRelationalSqliteStore, openSqliteDatabase } from "@morph/storage-sqlite-impls";',
		);
	}
	if (hasRedis) {
		imports.push(
			'import { connectRedis, createRedisTransport } from "@morph/storage-redis-impls";',
		);
	}
	if (hasEventsourced) {
		imports.push(
			'import { createEventsourcedTransport } from "@morph/storage-eventsourced-impls";',
		);
		imports.push(
			'import { EventStoreTransport } from "@morph/eventstore-dsl";',
		);
	}

	imports.push("");
	imports.push('import { IdGeneratorUUID } from "./id-generator-uuid";');

	// Import entity configs (for non-SQLite backends) and adapters
	if (needsEntityStore) {
		imports.push("import {");
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			imports.push(`\t${lower}StoreConfig,`);
		}
		imports.push('} from "./entity-configs";');
	}

	if (hasSqlite) {
		imports.push("import {");
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			imports.push(`\t${lower}RelationalConfig,`);
		}
		imports.push('} from "./relational-configs";');
	}

	for (const entry of aggregateRootEntries) {
		const pascal = toPascalCase(entry.name);
		const kebab = toKebabCase(entry.name);
		imports.push(
			`import { ${pascal}Repository } from "./${kebab}-repository";`,
		);
		imports.push(
			`import { create${pascal}RepositoryAdapter } from "./${kebab}-repository-adapter";`,
		);
	}

	// Build layer composition functions
	const layerFunctions: string[] = [];

	const buildLayerMerge = (
		aggregateRoots: readonly AggregateRootEntry[],
	): string => {
		const args = [
			"IdGeneratorUUID",
			...aggregateRoots.map(
				(entry) =>
					`Layer.succeed(${toPascalCase(entry.name)}Repository, ${entry.name.toLowerCase()}Repo)`,
			),
		].join(sep(2, ","));
		return `Layer.mergeAll(\n\t\t${args},\n\t)`;
	};

	if (hasMemory) {
		const storeLines: string[] = [];
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			const pascal = toPascalCase(entry.name);
			storeLines.push(
				`const ${lower}Transport = yield* createMemoryTransport();`,
			);
			storeLines.push(
				`const ${lower}Store = yield* createEntityStore(${lower}StoreConfig, ${lower}Transport);`,
			);
			storeLines.push(
				`const ${lower}Repo = create${pascal}RepositoryAdapter(${lower}Store);`,
			);
		}

		layerFunctions.push(`/**
 * Create in-memory storage layers for testing and development.
 */
export const createInMemoryLayers = () =>
\tEffect.gen(function* () {
${indent(storeLines.join("\n"), 2)}

\t\treturn ${buildLayerMerge(aggregateRootEntries)};
\t});`);
	}

	if (hasJsonFile) {
		const dataFilePath = `process.env["${envPrefix}_DATA_FILE"] ?? ".test-data.json"`;
		const storeLines: string[] = [];
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			const pascal = toPascalCase(entry.name);
			storeLines.push(
				`const ${lower}Transport = createJsonFileTransport(dataFile, "${lower}s");`,
			);
			storeLines.push(
				`const ${lower}Store = yield* createEntityStore(${lower}StoreConfig, ${lower}Transport);`,
			);
			storeLines.push(
				`const ${lower}Repo = create${pascal}RepositoryAdapter(${lower}Store);`,
			);
		}

		layerFunctions.push(`/**
 * Create JSON file-backed storage layers for CLI persistence.
 */
export const createJsonFileLayers = () =>
\tEffect.gen(function* () {
\t\tconst dataFile = ${dataFilePath};
${indent(storeLines.join("\n"), 2)}

\t\treturn ${buildLayerMerge(aggregateRootEntries)};
\t});`);
	}

	if (hasSqlite) {
		const sqlitePath = `process.env["${envPrefix}_SQLITE_PATH"] ?? ".data.sqlite"`;
		const storeLines: string[] = [];
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			const pascal = toPascalCase(entry.name);
			storeLines.push(
				`const ${lower}Store = createRelationalSqliteStore(db, ${lower}RelationalConfig);`,
			);
			storeLines.push(
				`const ${lower}Repo = create${pascal}RepositoryAdapter(${lower}Store);`,
			);
		}

		layerFunctions.push(`/**
 * Create SQLite-backed storage layers with relational schema.
 */
export const createSqliteLayers = () =>
\tEffect.gen(function* () {
\t\tconst db = yield* openSqliteDatabase(${sqlitePath});
${indent(storeLines.join("\n"), 2)}

\t\treturn ${buildLayerMerge(aggregateRootEntries)};
\t});`);
	}

	if (hasRedis) {
		const storeLines: string[] = [];
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			const pascal = toPascalCase(entry.name);
			storeLines.push(
				`const ${lower}Transport = createRedisTransport(redis, "${lower}s");`,
			);
			storeLines.push(
				`const ${lower}Store = yield* createEntityStore(${lower}StoreConfig, ${lower}Transport);`,
			);
			storeLines.push(
				`const ${lower}Repo = create${pascal}RepositoryAdapter(${lower}Store);`,
			);
		}

		layerFunctions.push(`/**
 * Create Redis-backed storage layers.
 */
export const createRedisLayers = () =>
\tEffect.gen(function* () {
\t\tconst redisUrl = process.env["${envPrefix}_REDIS_URL"] ?? process.env["REDIS_URL"];
\t\tconst redis = yield* connectRedis(redisUrl);
${indent(storeLines.join("\n"), 2)}

\t\treturn ${buildLayerMerge(aggregateRootEntries)};
\t});`);
	}

	if (hasEventsourced) {
		const storeLines: string[] = [];
		for (const entry of aggregateRootEntries) {
			const lower = entry.name.toLowerCase();
			const pascal = toPascalCase(entry.name);
			storeLines.push(
				`const ${lower}Transport = yield* createEventsourcedTransport(eventStoreTransport);`,
			);
			storeLines.push(
				`const ${lower}Store = yield* createEntityStore(${lower}StoreConfig, ${lower}Transport);`,
			);
			storeLines.push(
				`const ${lower}Repo = create${pascal}RepositoryAdapter(${lower}Store);`,
			);
		}

		layerFunctions.push(`/**
 * Create event-sourced storage layers.
 * Entity state is derived from the event store.
 * Requires EventStoreTransport in context (provided by event store layers).
 */
export const createEventsourcedLayers = () =>
\tEffect.gen(function* () {
\t\tconst eventStoreTransport = yield* EventStoreTransport;
${indent(storeLines.join("\n"), 2)}

\t\treturn ${buildLayerMerge(aggregateRootEntries)};
\t});`);
	}

	const content = `// Storage layer compositions using shared transports
// Do not edit - regenerate from schema

${imports.join("\n")}

${layerFunctions.join("\n\n")}
`;

	return { content, filename: "services/storage-layers.ts" };
};
