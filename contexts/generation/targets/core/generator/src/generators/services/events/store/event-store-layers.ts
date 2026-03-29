/**
 * EventStore layers generator.
 * Generates layer composition functions that wire transports via the functor.
 */

import type { EventStoreBackend, GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the event-store-layers file that composes transports via the functor.
 */
export const generateEventStoreLayers = (
	eventStoreBackends: readonly EventStoreBackend[],
	envPrefix: string,
	typesImportPath = "../schemas",
): GeneratedFile => {
	const hasMemory = eventStoreBackends.includes("memory");
	const hasJsonFile = eventStoreBackends.includes("jsonfile");
	const hasRedis = eventStoreBackends.includes("redis");

	// Build imports
	const imports: string[] = [
		'import { Effect, Layer } from "effect";',
		"",
		'import { createEventStore } from "@morphdsl/eventstore-impls";',
	];

	if (hasMemory) {
		imports.push(
			'import { createMemoryEventStoreTransport } from "@morphdsl/eventstore-memory-impls";',
		);
	}
	if (hasJsonFile) {
		imports.push(
			'import { createJsonFileEventStoreTransport } from "@morphdsl/eventstore-jsonfile-impls";',
		);
	}
	if (hasRedis) {
		imports.push(
			'import { connectEventStoreRedis, createRedisEventStoreTransport } from "@morphdsl/eventstore-redis-impls";',
		);
	}

	imports.push('import { EventStoreTransport } from "@morphdsl/eventstore-dsl";');

	imports.push("");
	imports.push(`import type { DomainEvent } from "${typesImportPath}";`);
	imports.push("");
	imports.push('import { EventStore } from "./event-store";');

	// Build layer composition functions
	const layerFunctions: string[] = [];

	if (hasMemory) {
		layerFunctions.push(`/**
 * Create an in-memory EventStore layer for testing and development.
 */
export const createInMemoryEventStore = () =>
\tEffect.gen(function* () {
\t\tconst transport = yield* createMemoryEventStoreTransport();
\t\tconst store = createEventStore<DomainEvent>(transport);
\t\treturn Layer.merge(
\t\t\tLayer.succeed(EventStore, store),
\t\t\tLayer.succeed(EventStoreTransport, transport),
\t\t);
\t});`);
	}

	if (hasJsonFile) {
		layerFunctions.push(`/**
 * Create a JSON file-backed EventStore layer.
 */
export const createJsonFileEventStore = () =>
\tEffect.sync(() => {
\t\tconst filePath = process.env["${envPrefix}_EVENT_STORE_FILE"] ?? ".events.json";
\t\tconst transport = createJsonFileEventStoreTransport(filePath);
\t\tconst store = createEventStore<DomainEvent>(transport);
\t\treturn Layer.merge(
\t\t\tLayer.succeed(EventStore, store),
\t\t\tLayer.succeed(EventStoreTransport, transport),
\t\t);
\t});`);
	}

	if (hasRedis) {
		layerFunctions.push(`/**
 * Create a Redis-backed EventStore layer.
 */
export const createRedisEventStore = () =>
\tEffect.gen(function* () {
\t\tconst redisUrl = process.env["${envPrefix}_REDIS_URL"] ?? process.env["REDIS_URL"];
\t\tconst redis = yield* connectEventStoreRedis(redisUrl);
\t\tconst transport = createRedisEventStoreTransport(redis);
\t\tconst store = createEventStore<DomainEvent>(transport);
\t\treturn Layer.merge(
\t\t\tLayer.succeed(EventStore, store),
\t\t\tLayer.succeed(EventStoreTransport, transport),
\t\t);
\t});`);
	}

	const content = `// EventStore layer compositions using shared transports
// Do not edit - regenerate from schema

${imports.join("\n")}

${layerFunctions.join("\n\n")}
`;

	return { content, filename: "services/event-store-layers.ts" };
};
