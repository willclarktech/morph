/**
 * EventStore registry generator.
 */

import type { EventStoreBackend, GeneratedFile } from "@morph/domain-schema";

/**
 * Generate the EventStore registry for runtime selection.
 */
export const generateEventStoreRegistry = (
	eventStoreBackends: readonly EventStoreBackend[],
	defaultBackend?: EventStoreBackend | undefined,
): GeneratedFile => {
	const hasMemory = eventStoreBackends.includes("memory");
	const hasJsonFile = eventStoreBackends.includes("jsonfile");
	const hasRedis = eventStoreBackends.includes("redis");

	// Build imports from event-store-layers
	const neededFunctions: string[] = [];
	if (hasMemory) neededFunctions.push("createInMemoryEventStore");
	if (hasJsonFile) neededFunctions.push("createJsonFileEventStore");
	if (hasRedis) neededFunctions.push("createRedisEventStore");

	const layersImport =
		neededFunctions.length > 0
			? `import { ${neededFunctions.join(", ")} } from "./event-store-layers";`
			: "";

	// Build registry entries
	const backendEntryMap: Record<string, { fn: string; label: string }> = {
		memory: { fn: "createInMemoryEventStore", label: "memory" },
		jsonfile: { fn: "createJsonFileEventStore", label: "jsonfile" },
		redis: { fn: "createRedisEventStore", label: "redis" },
	};

	const registryEntries: string[] = [];
	for (const backend of eventStoreBackends) {
		const entry = backendEntryMap[backend];
		if (entry) {
			registryEntries.push(`\t${entry.label}: () =>
		${entry.fn}().pipe(
			Effect.mapError(
				(error) =>
					new EventStoreSelectionError({
						eventStore: "${entry.label}",
						message: String(error),
					}),
			),
		),`);
		}
	}

	const content = `// Generated EventStore registry
// Do not edit - regenerate from schema

import { Data, Effect } from "effect";
import type { Layer } from "effect";

import type { EventStoreTransport } from "@morph/eventstore-dsl";

import type { EventStore } from "./event-store";

${layersImport}

/**
 * Error for unknown or failed event store selection.
 */
export class EventStoreSelectionError extends Data.TaggedError("EventStoreSelectionError")<{
	readonly eventStore: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

export type EventStoreLayer = Layer.Layer<EventStore | EventStoreTransport>;
export type EventStoreFactory = () => Effect.Effect<EventStoreLayer, EventStoreSelectionError>;

const registry: Record<string, EventStoreFactory> = {
${registryEntries.join("\n")}
};

export const availableEventStores = Object.keys(registry);

/**
 * Get an EventStore layer by name.
 */
export const getEventStoreLayer = (
	name: string,
): Effect.Effect<EventStoreLayer, EventStoreSelectionError> => {
	const factory = registry[name];
	if (!factory) {
		return Effect.fail(
			new EventStoreSelectionError({
				eventStore: name,
				message: \`Unknown event store backend: "\${name}". Available: \${availableEventStores.join(", ")}\`,
			}),
		);
	}
	return factory();
};

/**
 * Resolve an event store layer from config, env vars, and defaults.
 */
export const resolveEventStore = (config: {
	readonly envPrefix: string;
	readonly backendName?: string | undefined;
}): Effect.Effect<EventStoreLayer, EventStoreSelectionError> => {
	const name = config.backendName ?? process.env[\`\${config.envPrefix}_EVENT_STORE\`] ?? "${defaultBackend ?? eventStoreBackends[0] ?? "memory"}";
	return getEventStoreLayer(name).pipe(
		Effect.tapError((error) =>
			Effect.sync(() => {
				console.error(\`Event store error: \${error.message}\`);
				console.error(\`Available: \${availableEventStores.join(", ")}\`);
			}),
		),
	);
};
`;

	return { content, filename: "services/event-store-registry.ts" };
};
