import type { EventStoreTransport } from "@morphdsl/eventstore-dsl";

import { EventStoreOperationError } from "@morphdsl/eventstore-dsl";
import { jsonParse, jsonStringify } from "@morphdsl/utils";
import { Effect } from "effect";
import { readFileSync, writeFileSync } from "node:fs";

interface StoredEvent {
	readonly data: string;
	readonly tag: string;
	readonly occurredAt: string;
	readonly aggregateId: string;
}

const readEvents = (filePath: string): readonly StoredEvent[] => {
	try {
		const content = readFileSync(filePath, "utf8");
		return jsonParse(content) as StoredEvent[];
	} catch {
		return [];
	}
};

const writeEvents = (
	filePath: string,
	events: readonly StoredEvent[],
): void => {
	writeFileSync(filePath, jsonStringify(events));
};

/**
 * Create a JSON file-backed EventStoreTransport.
 * Appends serialized events to a JSON array file.
 */
export const createJsonFileEventStoreTransport = (
	filePath: string,
): EventStoreTransport => ({
	append: (data) =>
		Effect.try({
			try: () => {
				let tag = "";
				let occurredAt = "";
				let aggregateId = "";
				try {
					const parsed = jsonParse(data) as {
						_tag?: string;
						aggregateId?: string;
						occurredAt?: string;
					};
					tag = parsed._tag ?? "";
					occurredAt = parsed.occurredAt ?? "";
					aggregateId = parsed.aggregateId ?? "";
				} catch {
					// Non-JSON data is valid — tag/timestamp/aggregateId remain empty
				}
				const events = readEvents(filePath);
				writeEvents(filePath, [
					...events,
					{ data, tag, occurredAt, aggregateId },
				]);
			},
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to append event to file: ${String(error)}`,
				}),
		}),

	getAll: () =>
		Effect.try({
			try: () => readEvents(filePath).map((event) => event.data),
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to read events from file: ${String(error)}`,
				}),
		}),

	getByAggregateId: (aggregateId) =>
		Effect.try({
			try: () =>
				readEvents(filePath)
					.filter((event) => event.aggregateId === aggregateId)
					.map((event) => event.data),
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to read events from file: ${String(error)}`,
				}),
		}),

	getByTag: (tag) =>
		Effect.try({
			try: () =>
				readEvents(filePath)
					.filter((event) => event.tag === tag)
					.map((event) => event.data),
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to read events from file: ${String(error)}`,
				}),
		}),

	getAfter: (timestamp) =>
		Effect.try({
			try: () =>
				readEvents(filePath)
					.filter((event) => event.occurredAt > timestamp)
					.map((event) => event.data),
			catch: (error) =>
				new EventStoreOperationError({
					message: `Failed to read events from file: ${String(error)}`,
				}),
		}),
});
