/**
 * Storage registry generator.
 */

import type { GeneratedFile, StorageBackend } from "@morphdsl/domain-schema";

import { toPascalCase } from "@morphdsl/utils";

/**
 * Generate storage registry for runtime layer selection.
 */
export const generateStorageRegistry = (
	aggregateRoots: readonly string[],
	storageBackends: readonly StorageBackend[],
	defaultBackend?: StorageBackend,
): GeneratedFile => {
	const repoTypes = aggregateRoots
		.map((name) => `${toPascalCase(name)}Repository`)
		.join(" | ");

	const hasEventsourced = storageBackends.includes("eventsourced");

	// Build import from storage-layers
	const neededFunctions: string[] = [];
	if (storageBackends.includes("memory"))
		neededFunctions.push("createInMemoryLayers");
	if (storageBackends.includes("jsonfile"))
		neededFunctions.push("createJsonFileLayers");
	if (storageBackends.includes("sqlite"))
		neededFunctions.push("createSqliteLayers");
	if (storageBackends.includes("redis"))
		neededFunctions.push("createRedisLayers");
	if (hasEventsourced) neededFunctions.push("createEventsourcedLayers");

	const storageLayersImport =
		neededFunctions.length > 0
			? `import { ${neededFunctions.join(", ")} } from "./storage-layers";`
			: "";

	// Build registry entries — eventsourced is handled as special case (needs EventStoreTransport)
	const backendEntryMap: Record<string, { fn: string; label: string }> = {
		memory: { fn: "createInMemoryLayers", label: "memory" },
		jsonfile: { fn: "createJsonFileLayers", label: "jsonfile" },
		sqlite: { fn: "createSqliteLayers", label: "sqlite" },
		redis: { fn: "createRedisLayers", label: "redis" },
	};

	const registryEntries: string[] = [];
	for (const backend of storageBackends) {
		if (backend === "eventsourced") continue;
		const entry = backendEntryMap[backend];
		if (entry) {
			registryEntries.push(`\t${entry.label}: () =>
		${entry.fn}().pipe(
			Effect.mapError(
				(error) =>
					new StorageError({
						storage: "${entry.label}",
						message: String(error),
					}),
			),
		),`);
		}
	}

	const content = `// Storage registry for runtime layer selection
// Enables switching between storage backends via CLI flag or env var

import type { Layer } from "effect";

import { Data, Effect } from "effect";

import type { IdGenerator } from "./id-generator";
import type { ${aggregateRoots.map((name) => `${toPascalCase(name)}Repository`).join(", ")} } from "./index";

${storageLayersImport}

/**
 * Error when storage backend is unknown or unavailable.
 */
export class StorageError extends Data.TaggedError("StorageError")<{
	readonly storage: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Combined storage layer type for all repositories.
 */
export type StorageLayer = Layer.Layer<${repoTypes} | IdGenerator>;

/**
 * Factory function that creates a storage layer.
 */
export type StorageFactory = () => Effect.Effect<StorageLayer, StorageError>;

/**
 * Registry mapping storage names to layer factories.
 * Factories are lazy - layers are only created when selected.
 */
const registry: Record<string, StorageFactory> = {
${registryEntries.join("\n")}
};

/**
 * Available storage backend names.
 */
export const availableStorages = ${hasEventsourced ? '[...Object.keys(registry), "eventsourced"]' : "Object.keys(registry)"};

/**
 * Get a storage layer by name.
 * Returns an Effect that fails with StorageError if the name is unknown.
 */
export const getStorageLayer = (
	name: string,
): Effect.Effect<StorageLayer, StorageError> => {
	const factory = registry[name];
	if (!factory) {
		return Effect.fail(
			new StorageError({
				storage: name,
				message: \`Unknown storage backend: "\${name}". Available: \${availableStorages.join(", ")}\`,
			}),
		);
	}
	return factory();
};

/**
 * Resolve a storage layer from config, env vars, and defaults.
 * Warns if using in-memory storage in production.
 */
export const resolveStorage = (config: {
	readonly envPrefix: string;
	readonly backendName?: string | undefined;
}) => {
	const name = config.backendName ?? process.env[\`\${config.envPrefix}_STORAGE\`] ?? "${defaultBackend ?? storageBackends[0] ?? "memory"}";
	if (name === "memory" && process.env.NODE_ENV === "production") {
		console.warn("⚠️  WARNING: Using in-memory storage in production. Data will be lost on restart.");
		console.warn(\`   Set \${config.envPrefix}_STORAGE=jsonfile or redis for persistent storage.\`);
	}
${
	hasEventsourced
		? `\tif (name === "eventsourced") {
		return createEventsourcedLayers().pipe(
			Effect.mapError(
				(error) =>
					new StorageError({
						storage: "eventsourced",
						message: String(error),
					}),
			),
		);
	}
`
		: ""
}\treturn getStorageLayer(name).pipe(
		Effect.tapError((error) =>
			Effect.sync(() => {
				console.error(\`Storage error: \${error.message}\`);
				console.error(\`Available: \${availableStorages.join(", ")}\`);
			}),
		),
	);
};
`;

	return { content, filename: "services/storage-registry.ts" };
};
