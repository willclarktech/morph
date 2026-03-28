import type { EventStoreTransport } from "@morph/eventstore-dsl";

import { EventStoreOperationError } from "@morph/eventstore-dsl";
import { jsonParse, jsonStringify } from "@morph/utils";
import { Effect } from "effect";

/**
 * Shape of a typed event store — matches generated EventStore interface.
 */
export interface EventStoreShape<TEvent> {
	readonly append: (
		event: TEvent,
	) => Effect.Effect<void, EventStoreOperationError>;
	readonly getAll: () => Effect.Effect<
		readonly TEvent[],
		EventStoreOperationError
	>;
	readonly getByAggregateId: (
		aggregateId: string,
	) => Effect.Effect<readonly TEvent[], EventStoreOperationError>;
	readonly getByTag: (
		tag: string,
	) => Effect.Effect<readonly TEvent[], EventStoreOperationError>;
	readonly getAfter: (
		timestamp: string,
	) => Effect.Effect<readonly TEvent[], EventStoreOperationError>;
}

/**
 * Create a typed EventStore by wrapping an EventStoreTransport with JSON serialization.
 *
 * The transport operates on raw strings; this functor adds JSON.stringify on append
 * and JSON.parse on read, bridging the transport to the domain event type.
 */
export const createEventStore = <TEvent>(
	transport: EventStoreTransport,
): EventStoreShape<TEvent> => ({
	append: (event) =>
		transport.append(jsonStringify(event)).pipe(
			Effect.catchAll(
				(error) =>
					new EventStoreOperationError({
						message: `Failed to append event: ${error.message}`,
					}),
			),
		),

	getAll: () =>
		transport
			.getAll()
			.pipe(
				Effect.map((items) => items.map((item) => jsonParse(item) as TEvent)),
			),

	getByAggregateId: (aggregateId) =>
		transport
			.getByAggregateId(aggregateId)
			.pipe(
				Effect.map((items) => items.map((item) => jsonParse(item) as TEvent)),
			),

	getByTag: (tag) =>
		transport
			.getByTag(tag)
			.pipe(
				Effect.map((items) => items.map((item) => jsonParse(item) as TEvent)),
			),

	getAfter: (timestamp) =>
		transport
			.getAfter(timestamp)
			.pipe(
				Effect.map((items) => items.map((item) => jsonParse(item) as TEvent)),
			),
});
