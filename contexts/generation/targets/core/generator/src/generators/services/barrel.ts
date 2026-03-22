/**
 * Services barrel export generator.
 */

import type {
	AuthProvider,
	EventStoreBackend,
	GeneratedFile,
	StorageBackend,
} from "@morph/domain-schema";

import { toKebabCase } from "@morph/utils";

/**
 * Generate the services barrel export file with composed InMemoryLayer.
 */
export const generateServicesBarrel = (
	aggregateRoots: readonly string[],
	hasEvents: boolean,
	hasSubscribers: boolean,
	storageBackends: readonly StorageBackend[],
	authProviders: readonly AuthProvider[],
	eventStoreBackends: readonly EventStoreBackend[],
): GeneratedFile => {
	const hasMemory = storageBackends.includes("memory");
	const hasEventsourced = storageBackends.includes("eventsourced");
	const hasSqlite = storageBackends.includes("sqlite");
	const hasAnyStorage = storageBackends.length > 0;
	const hasEventStoreMemory = eventStoreBackends.includes("memory");

	const eventExports = hasEvents
		? [
				'export * from "./event-emitter";',
				'export * from "./event-emitter-inmemory";',
			]
		: [];

	const subscriberExports = hasSubscribers
		? [
				'export * from "./event-subscriber";',
				'export * from "./event-subscriber-registry";',
				'export * from "./subscriber-bootstrap";',
			]
		: [];

	const eventStoreExports = hasEvents
		? [
				'export * from "./event-store";',
				...(eventStoreBackends.length > 0
					? ['export * from "./event-store-layers";']
					: []),
				'export * from "./event-store-registry";',
			]
		: [];

	// Auth service exports - conditionally include based on config
	const authExports = [
		'export * from "./auth-errors";',
		'export * from "./auth-service";',
		...(authProviders.includes("none")
			? ['export * from "./auth-service-none";']
			: []),
		...(authProviders.includes("test")
			? ['export * from "./auth-service-test";']
			: []),
		...(authProviders.includes("inmemory")
			? ['export * from "./auth-service-inmemory";']
			: []),
		...(authProviders.includes("jwt")
			? ['export * from "./auth-service-jwt";']
			: []),
		...(authProviders.includes("session")
			? ['export * from "./auth-service-session";']
			: []),
		...(authProviders.includes("apikey")
			? ['export * from "./auth-service-apikey";']
			: []),
		'export * from "./auth-registry";',
	];

	// Storage exports - entity configs, adapters, layers
	const storageExports: string[] = [
		'export * from "./entity-configs";',
		...(hasSqlite ? ['export * from "./relational-configs";'] : []),
		...aggregateRoots.map(
			(name) => `export * from "./${toKebabCase(name)}-repository-adapter";`,
		),
	];
	if (hasAnyStorage) {
		storageExports.push('export * from "./storage-layers";');
	}

	// Repository exports - interfaces only (no per-entity inmemory files anymore)
	const repoExports = aggregateRoots.map(
		(name) => `export * from "./${toKebabCase(name)}-repository";`,
	);

	const reexports = [
		'export * from "./errors";',
		'export * from "./id-generator";',
		'export * from "./id-generator-uuid";',
		...repoExports,
		...storageExports,
		...eventExports,
		...subscriberExports,
		...eventStoreExports,
		...authExports,
		'export * from "./storage-registry";',
	]
		.sort()
		.join("\n");

	// Determine which storage creation function to use for InMemoryLayer
	const hasInMemoryLayer = hasMemory || hasEventsourced;
	const storageCreatorFn = hasMemory
		? "createInMemoryLayers"
		: "createEventsourcedLayers";
	const storageCreatorImport = hasMemory
		? 'import { createInMemoryLayers } from "./storage-layers";'
		: hasEventsourced
			? 'import { createEventsourcedLayers } from "./storage-layers";'
			: "";

	// InMemoryLayer uses storage-layers when memory or eventsourced backend is configured
	const inMemoryImports = hasInMemoryLayer
		? [
				...(hasEvents
					? ['import { EventEmitterInMemory } from "./event-emitter-inmemory";']
					: []),
				...(hasEvents && hasEventStoreMemory
					? ['import { createInMemoryEventStore } from "./event-store-layers";']
					: []),
				...(hasSubscribers
					? [
							'import { EventSubscriberRegistry } from "./event-subscriber-registry";',
						]
					: []),
				storageCreatorImport,
			].join("\n")
		: "";

	// InMemoryLayer merges the storage layer with event layers
	const hasEventLayers = hasEvents || hasSubscribers;
	const hasEventStoreLayer = hasEvents && hasEventStoreMemory;

	let inMemoryLayerDef = "";
	if (hasInMemoryLayer) {
		if (hasEventLayers) {
			// For eventsourced: event store layer is created first and provided to storage
			// For memory: storage is independent, event store created after
			const storageLayerLine =
				hasEventsourced && hasEventStoreLayer
					? `const storageLayer = yield* ${storageCreatorFn}().pipe(Effect.provide(eventStoreLayer));`
					: `const storageLayer = yield* ${storageCreatorFn}();`;
			const eventStoreLayerLine = hasEventStoreLayer
				? "const eventStoreLayer = yield* createInMemoryEventStore();"
				: "";

			// When eventsourced, event store comes first; otherwise storage comes first
			const setupLines =
				hasEventsourced && hasEventStoreLayer
					? [eventStoreLayerLine, storageLayerLine].filter(Boolean)
					: [storageLayerLine, eventStoreLayerLine].filter(Boolean);

			const mergeArgs = [
				"storageLayer",
				...(hasEvents ? ["EventEmitterInMemory"] : []),
				...(hasEventStoreLayer ? ["eventStoreLayer"] : []),
				...(hasSubscribers ? ["EventSubscriberRegistry"] : []),
			]
				.map((arg) => `\t\t\t\t${arg},`)
				.join("\n");

			const setupCode = setupLines.map((l) => `\t\t${l}`).join("\n");

			inMemoryLayerDef = `
/**
 * Composed layer with all InMemory implementations.
 * Replace with production layers in real applications.
 */
export const InMemoryLayer = Layer.unwrapEffect(
	Effect.gen(function* () {
${setupCode}
\t\treturn Layer.mergeAll(
${mergeArgs}
\t\t);
\t}),
);`;
		} else {
			inMemoryLayerDef = `
/**
 * Composed layer with all InMemory implementations.
 * Replace with production layers in real applications.
 */
export const InMemoryLayer = Layer.unwrapEffect(${storageCreatorFn}());`;
		}
	}

	// Only import Effect/Layer if we need them for InMemoryLayer
	const layerImports = hasInMemoryLayer
		? `import { Effect, Layer } from "effect";

${inMemoryImports}`
		: "";

	const content = `// Generated services barrel export
// Do not edit - regenerate from schema

${layerImports}

${reexports}
${inMemoryLayerDef}
`;

	return { content, filename: "services/index.ts" };
};
