/**
 * Generate Effect-based repository services from aggregate roots.
 *
 * Follows the Effect service pattern:
 * - Interface definition
 * - Context.GenericTag for DI
 * - Typed errors with Data.TaggedError
 * - Layer.succeed for creating layers
 */

import type {
	DomainSchema,
	Extensions,
	GeneratedFile,
} from "@morph/domain-schema";

import {
	DEFAULT_EXTENSIONS,
	getAggregateRoots,
	getAllSubscribers,
	getCommandsWithEvents,
} from "@morph/domain-schema";

import {
	generateAuthErrors,
	generateAuthRegistry,
	generateAuthService,
	generateAuthServiceApiKey,
	generateAuthServiceInMemory,
	generateAuthServiceJwt,
	generateAuthServiceNone,
	generateAuthServiceSession,
	generateAuthServiceTest,
} from "./auth";
import { generateServicesBarrel } from "./barrel";
import { generateErrorsFile } from "./errors";
import {
	generateEventEmitterInMemory,
	generateEventEmitterService,
} from "./events/emitter";
import {
	generateEventStoreLayers,
	generateEventStoreRegistry,
	generateEventStoreService,
} from "./events/store";
import {
	generateEventSubscriberRegistry,
	generateEventSubscriberService,
	generateSubscriberBootstrap,
} from "./events/subscriber";
import {
	generateIdGeneratorService,
	generateIdGeneratorUUID,
} from "./id-generator";
import { generateRepositoryService } from "./repository";
import {
	generateEntityConfigs,
	generateRelationalConfigs,
	generateRepositoryAdapter,
	generateStorageLayers,
	generateStorageRegistry,
} from "./storage";
import { toEnvironmentPrefix } from "./utilities";

// Re-export auth generators for external use
export {
	generateAuthErrors,
	generateAuthService,
	generateAuthServiceNone,
	generateAuthServiceTest,
} from "./auth";

/**
 * Generate all service files for a schema.
 */
export const generateServices = (
	schema: DomainSchema,
	typesImportPath = "../schemas",
	extensions?: Extensions,
	customEnvironmentPrefix?: string,
	projectName = "app",
): readonly GeneratedFile[] => {
	const aggregateRootEntries = getAggregateRoots(schema);
	const aggregateRoots = aggregateRootEntries.map((entry) => entry.name);
	const hasEvents = getCommandsWithEvents(schema).length > 0;
	const hasSubscribers = getAllSubscribers(schema).length > 0;
	const config = extensions ?? DEFAULT_EXTENSIONS;
	const storageBackends = config.storage?.backends ?? [];
	const eventStoreBackends =
		config.eventStore?.backends ?? (hasEvents ? ["memory" as const] : []);
	const envPrefix = customEnvironmentPrefix ?? toEnvironmentPrefix(schema.name);

	if (aggregateRoots.length === 0) {
		return [];
	}

	const errorsFile = generateErrorsFile();
	const idGeneratorFile = generateIdGeneratorService(projectName);
	const idGeneratorUUIDFile = generateIdGeneratorUUID();
	const repoFiles = aggregateRootEntries.map((entry) =>
		generateRepositoryService(
			entry.name,
			entry.def,
			typesImportPath,
			projectName,
		),
	);

	// Generate storage: entity configs, repository adapters, layer compositions, registry
	const entityConfigsFile = generateEntityConfigs(aggregateRootEntries);
	const relationalConfigsFile = storageBackends.includes("sqlite")
		? [generateRelationalConfigs(aggregateRootEntries, schema)]
		: [];
	const adapterFiles = aggregateRootEntries.map((entry) =>
		generateRepositoryAdapter(entry.name, entry.def, typesImportPath),
	);
	const storageLayersFile =
		storageBackends.length > 0
			? [
					generateStorageLayers(
						aggregateRootEntries,
						storageBackends,
						envPrefix,
					),
				]
			: [];
	const storageRegistryFile = generateStorageRegistry(
		aggregateRoots,
		storageBackends,
		config.storage?.default,
	);

	// EventEmitter service (only if schema has events)
	const eventEmitterFiles = hasEvents
		? [
				generateEventEmitterService(typesImportPath, projectName),
				generateEventEmitterInMemory(typesImportPath),
			]
		: [];

	// EventSubscriber service (only if schema has subscribers)
	const eventSubscriberFiles = hasSubscribers
		? [
				generateEventSubscriberService(schema, typesImportPath, projectName),
				generateEventSubscriberRegistry(schema, typesImportPath),
			]
		: [];

	// EventStore service (only if schema has events)
	const eventStoreFiles = hasEvents
		? [
				generateEventStoreService(typesImportPath, projectName),
				...(eventStoreBackends.length > 0
					? [
							generateEventStoreLayers(
								eventStoreBackends,
								envPrefix,
								typesImportPath,
							),
						]
					: []),
				generateEventStoreRegistry(
					eventStoreBackends,
					config.eventStore?.default,
				),
			]
		: [];

	// Subscriber bootstrap (only if schema has subscribers)
	const subscribers = getAllSubscribers(schema);
	const bootstrapFiles = hasSubscribers
		? [generateSubscriberBootstrap(subscribers)]
		: [];

	// Auth service - conditionally generate based on config
	const authProviders = config.auth?.providers ?? ["none", "inmemory", "test"];
	const authFiles: GeneratedFile[] = [
		generateAuthErrors(),
		generateAuthService(typesImportPath, projectName),
	];

	// Generate only configured providers
	if (authProviders.includes("none")) authFiles.push(generateAuthServiceNone());
	if (authProviders.includes("test")) authFiles.push(generateAuthServiceTest());
	if (authProviders.includes("inmemory"))
		authFiles.push(generateAuthServiceInMemory());
	if (authProviders.includes("jwt"))
		authFiles.push(generateAuthServiceJwt(envPrefix));
	if (authProviders.includes("session"))
		authFiles.push(generateAuthServiceSession(envPrefix));
	if (authProviders.includes("apikey"))
		authFiles.push(generateAuthServiceApiKey(envPrefix));

	// Generate auth registry
	authFiles.push(
		generateAuthRegistry(authProviders, config.auth?.default ?? "none"),
	);

	const barrelFile = generateServicesBarrel(
		aggregateRoots,
		hasEvents,
		hasSubscribers,
		storageBackends,
		authProviders,
		eventStoreBackends,
	);

	return [
		errorsFile,
		idGeneratorFile,
		idGeneratorUUIDFile,
		...repoFiles,
		entityConfigsFile,
		...relationalConfigsFile,
		...adapterFiles,
		...storageLayersFile,
		...eventEmitterFiles,
		...eventSubscriberFiles,
		...eventStoreFiles,
		...bootstrapFiles,
		...authFiles,
		storageRegistryFile,
		barrelFile,
	];
};
