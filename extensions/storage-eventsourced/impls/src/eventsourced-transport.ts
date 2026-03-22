import { Effect, Ref } from "effect";

import type { EventStoreTransport } from "@morph/eventstore-dsl";
import type { PaginationParams, StorageTransport } from "@morph/storage-dsl";

import { StorageOperationError, applyPagination } from "@morph/storage-dsl";
import { jsonParse, jsonStringify } from "@morph/utils";

interface ParsedEvent {
	readonly aggregateId: string;
	readonly result: Record<string, unknown>;
}

const parseEvent = (data: string): ParsedEvent | undefined => {
	try {
		const parsed = jsonParse(data) as {
			aggregateId?: string;
			result?: Record<string, unknown>;
		};
		if (parsed.aggregateId && parsed.result) {
			return {
				aggregateId: parsed.aggregateId,
				result: parsed.result,
			};
		}
	} catch {
		// Not a valid event
	}
	return undefined;
};

const mapErr = Effect.mapError(
	(e: unknown) =>
		new StorageOperationError({ message: `Event store error: ${String(e)}` }),
);

/**
 * Create an event-sourced StorageTransport.
 *
 * Reads reconstruct entity state from the event store by returning
 * the `result` field of the most recent event for each aggregate.
 * Writes update a snapshot cache (the event store is the source of truth,
 * events are appended by the wrapper layer).
 */
export const createEventsourcedTransport = (
	eventStoreTransport: EventStoreTransport,
): Effect.Effect<StorageTransport> =>
	Effect.gen(function* () {
		const snapshotCache = yield* Ref.make(new Map<string, string>());

		// Best-effort cache warmup — reads will individually check the event store
		yield* eventStoreTransport.getAll().pipe(
			Effect.tap((allEvents) =>
				Effect.sync(() => {
					const snapshots = new Map<string, string>();
					for (const raw of allEvents) {
						const parsed = parseEvent(raw);
						if (parsed) {
							snapshots.set(parsed.aggregateId, jsonStringify(parsed.result));
						}
					}
					return snapshots;
				}).pipe(Effect.flatMap((s) => Ref.set(snapshotCache, s))),
			),
			Effect.catchAll(() => Effect.void),
		);

		return {
			get: (id) =>
				Effect.gen(function* () {
					// Try event store first (source of truth)
					const events = yield* eventStoreTransport
						.getByAggregateId(id)
						.pipe(mapErr);
					if (events.length > 0) {
						const lastEvent = parseEvent(events[events.length - 1]!);
						if (lastEvent) return jsonStringify(lastEvent.result);
					}
					// Fall back to snapshot cache (populated by put() calls)
					const cache = yield* Ref.get(snapshotCache);
					return cache.get(id);
				}),

			getAll: (pagination?: PaginationParams | undefined) =>
				Ref.get(snapshotCache).pipe(
					Effect.map((m) => applyPagination([...m.values()], pagination)),
				),

			put: (id, data) =>
				Ref.update(snapshotCache, (m) => new Map(m).set(id, data)),

			remove: (id) =>
				Ref.update(snapshotCache, (m) => {
					const next = new Map(m);
					next.delete(id);
					return next;
				}),
		};
	});
