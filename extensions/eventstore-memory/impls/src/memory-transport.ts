import { Effect, Ref } from "effect";

import type { EventStoreTransport } from "@morph/eventstore-dsl";

interface StoredEvent {
	readonly data: string;
	readonly tag: string;
	readonly occurredAt: string;
	readonly aggregateId: string;
}

/**
 * Create an in-memory EventStoreTransport backed by a Ref.
 * Suitable for testing and development.
 */
export const createMemoryEventStoreTransport =
	(): Effect.Effect<EventStoreTransport> =>
		Effect.gen(function* () {
			const store = yield* Ref.make<readonly StoredEvent[]>([]);

			return {
				append: (data) =>
					Ref.update(store, (list) => {
						let tag = "";
						let occurredAt = "";
						let aggregateId = "";
						try {
							const parsed = JSON.parse(data) as {
								_tag?: string;
								occurredAt?: string;
								aggregateId?: string;
							};
							tag = parsed._tag ?? "";
							occurredAt = parsed.occurredAt ?? "";
							aggregateId = parsed.aggregateId ?? "";
						} catch {
							// Non-JSON data is valid — tag/timestamp/aggregateId remain empty
						}
						return [...list, { data, tag, occurredAt, aggregateId }];
					}),

				getAll: () =>
					Ref.get(store).pipe(Effect.map((list) => list.map((ev) => ev.data))),

				getByAggregateId: (aggregateId) =>
					Ref.get(store).pipe(
						Effect.map((list) =>
							list
								.filter((ev) => ev.aggregateId === aggregateId)
								.map((ev) => ev.data),
						),
					),

				getByTag: (tag) =>
					Ref.get(store).pipe(
						Effect.map((list) =>
							list.filter((ev) => ev.tag === tag).map((ev) => ev.data),
						),
					),

				getAfter: (timestamp) =>
					Ref.get(store).pipe(
						Effect.map((list) =>
							list
								.filter((ev) => ev.occurredAt > timestamp)
								.map((ev) => ev.data),
						),
					),
			};
		});
