/**
 * EventStore service interface generator.
 */

import type { GeneratedFile } from "@morphdsl/domain-schema";

/**
 * Generate the EventStore service interface.
 */
export const generateEventStoreService = (
	typesImportPath = "../schemas",
	projectName = "app",
): GeneratedFile => {
	const content = `// Generated EventStore service interface
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type { DomainEvent } from "${typesImportPath}";

import type { EventStoreOperationError } from "@morphdsl/eventstore-dsl";

/**
 * Service for durable event storage.
 * Provides append-only persistence and query capabilities.
 */
export interface EventStore {
	readonly append: (event: DomainEvent) => Effect.Effect<void, EventStoreOperationError>;
	readonly getAll: () => Effect.Effect<readonly DomainEvent[], EventStoreOperationError>;
	readonly getByAggregateId: (aggregateId: string) => Effect.Effect<readonly DomainEvent[], EventStoreOperationError>;
	readonly getByTag: (tag: string) => Effect.Effect<readonly DomainEvent[], EventStoreOperationError>;
	readonly getAfter: (timestamp: string) => Effect.Effect<readonly DomainEvent[], EventStoreOperationError>;
}

/**
 * Context tag for EventStore dependency injection.
 */
export const EventStore = Context.GenericTag<EventStore>("@${projectName}/EventStore");
`;

	return { content, filename: "services/event-store.ts" };
};
