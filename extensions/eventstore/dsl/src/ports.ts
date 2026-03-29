// Port (DI contract) definitions
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

import type { EventStoreOperationError } from "./errors";

/**
 * Raw append-only event storage transport using serialized strings
 */
export interface EventStoreTransport {
	/**
	 * Append a serialized event
	 */
	readonly append: (
		data: string,
	) => Effect.Effect<void, EventStoreOperationError>;

	/**
	 * Get all serialized events
	 */
	readonly getAll: () => Effect.Effect<
		readonly string[],
		EventStoreOperationError
	>;

	/**
	 * Get serialized events for an aggregate
	 */
	readonly getByAggregateId: (
		aggregateId: string,
	) => Effect.Effect<readonly string[], EventStoreOperationError>;

	/**
	 * Get serialized events matching tag
	 */
	readonly getByTag: (
		tag: string,
	) => Effect.Effect<readonly string[], EventStoreOperationError>;

	/**
	 * Get serialized events after timestamp
	 */
	readonly getAfter: (
		timestamp: string,
	) => Effect.Effect<readonly string[], EventStoreOperationError>;
}

/**
 * Context tag for EventStoreTransport dependency injection.
 */
export const EventStoreTransport = Context.GenericTag<EventStoreTransport>(
	"@morphdsl/EventStoreTransport",
);
