/* eslint-disable @typescript-eslint/no-non-null-assertion -- index maps are pre-populated from config.indexes; .get(field)! is safe within the allIndexedFields loop */
/* eslint-disable @typescript-eslint/no-base-to-string -- indexed field values are primitives (string/number/boolean) */
import type {
	EntityStore,
	EntityStoreConfig,
	PaginationParams,
	StorageTransport,
} from "@morph/storage-dsl";

import { applyPagination, StorageOperationError } from "@morph/storage-dsl";
import { Effect } from "effect";

/**
 * Create an EntityStore by wrapping a StorageTransport with secondary index management.
 *
 * Indexes are maintained in-memory Maps, built by scanning all existing data on creation.
 * The transport handles raw key-value persistence; the functor adds index lookups on top.
 */
export const createEntityStore = (
	config: EntityStoreConfig,
	transport: StorageTransport,
): Effect.Effect<EntityStore, StorageOperationError> =>
	Effect.gen(function* () {
		// Build index descriptors lookup
		const uniqueIndexes = new Set(
			config.indexes
				.filter((index) => index.kind === "unique")
				.map((index) => index.field),
		);
		const allIndexedFields = config.indexes.map((index) => index.field);

		// Secondary index state: field -> (value -> id) for unique, field -> (value -> Set<id>) for non-unique
		const uniqueMaps = new Map<string, Map<string, string>>();
		const nonUniqueMaps = new Map<string, Map<string, Set<string>>>();

		for (const index of config.indexes) {
			if (index.kind === "unique") {
				uniqueMaps.set(index.field, new Map());
			} else {
				nonUniqueMaps.set(index.field, new Map());
			}
		}

		// Initialize indexes by scanning existing data
		if (allIndexedFields.length > 0) {
			const result = yield* transport.getAll();
			for (const json of result.items) {
				const parsed = JSON.parse(json) as Record<string, unknown>;
				const id = parsed["id"] as string;
				for (const field of allIndexedFields) {
					const value = parsed[field];
					if (value === undefined) continue;
					const stringValue = String(value);
					if (uniqueIndexes.has(field)) {
						uniqueMaps.get(field)!.set(stringValue, id);
					} else {
						const map = nonUniqueMaps.get(field)!;
						const set = map.get(stringValue) ?? new Set();
						set.add(id);
						map.set(stringValue, set);
					}
				}
			}
		}

		const updateIndexesForPut = (id: string, json: string): void => {
			const parsed = JSON.parse(json) as Record<string, unknown>;
			for (const field of allIndexedFields) {
				const value = parsed[field];
				if (value === undefined) continue;
				const stringValue = String(value);
				if (uniqueIndexes.has(field)) {
					uniqueMaps.get(field)!.set(stringValue, id);
				} else {
					const map = nonUniqueMaps.get(field)!;
					const set = map.get(stringValue) ?? new Set();
					set.add(id);
					map.set(stringValue, set);
				}
			}
		};

		const removeIndexesForEntity = (id: string, json: string): void => {
			const parsed = JSON.parse(json) as Record<string, unknown>;
			for (const field of allIndexedFields) {
				const value = parsed[field];
				if (value === undefined) continue;
				const stringValue = String(value);
				if (uniqueIndexes.has(field)) {
					uniqueMaps.get(field)!.delete(stringValue);
				} else {
					const map = nonUniqueMaps.get(field)!;
					const set = map.get(stringValue);
					if (set) {
						set.delete(id);
						if (set.size === 0) map.delete(stringValue);
					}
				}
			}
		};

		return {
			get: (id) => transport.get(id),

			getAll: (pagination?: PaginationParams) => transport.getAll(pagination),

			put: (id, data) =>
				Effect.gen(function* () {
					// Remove old indexes if entity already exists
					if (allIndexedFields.length > 0) {
						const existing = yield* transport.get(id);
						if (existing !== undefined) {
							removeIndexesForEntity(id, existing);
						}
					}
					yield* transport.put(id, data);
					updateIndexesForPut(id, data);
				}),

			remove: (id) =>
				Effect.gen(function* () {
					if (allIndexedFields.length > 0) {
						const existing = yield* transport.get(id);
						if (existing !== undefined) {
							removeIndexesForEntity(id, existing);
						}
					}
					yield* transport.remove(id);
				}),

			findByIndex: (field, value) =>
				Effect.gen(function* () {
					const uniqueMap = uniqueMaps.get(field);
					if (uniqueMap) {
						const id = uniqueMap.get(value);
						if (!id) return undefined;
						return yield* transport.get(id);
					}
					// Fall back to non-unique (return first match)
					const nonUniqueMap = nonUniqueMaps.get(field);
					if (nonUniqueMap) {
						const ids = nonUniqueMap.get(value);
						if (!ids || ids.size === 0) return undefined;
						const firstId = ids.values().next().value!;
						return yield* transport.get(firstId);
					}
					return yield* Effect.fail(
						new StorageOperationError({
							message: `No index on field "${field}" for entity "${config.entityName}"`,
						}),
					);
				}),

			findAllByIndex: (field, value, pagination?: PaginationParams) =>
				Effect.gen(function* () {
					const nonUniqueMap = nonUniqueMaps.get(field);
					if (nonUniqueMap) {
						const ids = nonUniqueMap.get(value);
						if (!ids || ids.size === 0)
							return { items: [] as string[], total: 0 };
						const results: string[] = [];
						for (const id of ids) {
							const data = yield* transport.get(id);
							if (data !== undefined) results.push(data);
						}
						return applyPagination(results, pagination);
					}
					// Fall back to unique (return single match as array)
					const uniqueMap = uniqueMaps.get(field);
					if (uniqueMap) {
						const id = uniqueMap.get(value);
						if (!id) return { items: [] as string[], total: 0 };
						const data = yield* transport.get(id);
						const all = data === undefined ? [] : [data];
						return applyPagination(all, pagination);
					}
					return yield* Effect.fail(
						new StorageOperationError({
							message: `No index on field "${field}" for entity "${config.entityName}"`,
						}),
					);
				}),
		};
	});
