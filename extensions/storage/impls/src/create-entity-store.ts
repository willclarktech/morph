import { Effect } from "effect";

import type {
	EntityStore,
	EntityStoreConfig,
	PaginationParams,
	StorageTransport,
} from "@morph/storage-dsl";

import { StorageOperationError, applyPagination } from "@morph/storage-dsl";

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
				.filter((idx) => idx.kind === "unique")
				.map((idx) => idx.field),
		);
		const allIndexedFields = config.indexes.map((idx) => idx.field);

		// Secondary index state: field -> (value -> id) for unique, field -> (value -> Set<id>) for non-unique
		const uniqueMaps = new Map<string, Map<string, string>>();
		const nonUniqueMaps = new Map<string, Map<string, Set<string>>>();

		for (const idx of config.indexes) {
			if (idx.kind === "unique") {
				uniqueMaps.set(idx.field, new Map());
			} else {
				nonUniqueMaps.set(idx.field, new Map());
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
					const strValue = String(value);
					if (uniqueIndexes.has(field)) {
						uniqueMaps.get(field)!.set(strValue, id);
					} else {
						const map = nonUniqueMaps.get(field)!;
						const set = map.get(strValue) ?? new Set();
						set.add(id);
						map.set(strValue, set);
					}
				}
			}
		}

		const updateIndexesForPut = (id: string, json: string): void => {
			const parsed = JSON.parse(json) as Record<string, unknown>;
			for (const field of allIndexedFields) {
				const value = parsed[field];
				if (value === undefined) continue;
				const strValue = String(value);
				if (uniqueIndexes.has(field)) {
					uniqueMaps.get(field)!.set(strValue, id);
				} else {
					const map = nonUniqueMaps.get(field)!;
					const set = map.get(strValue) ?? new Set();
					set.add(id);
					map.set(strValue, set);
				}
			}
		};

		const removeIndexesForEntity = (id: string, json: string): void => {
			const parsed = JSON.parse(json) as Record<string, unknown>;
			for (const field of allIndexedFields) {
				const value = parsed[field];
				if (value === undefined) continue;
				const strValue = String(value);
				if (uniqueIndexes.has(field)) {
					uniqueMaps.get(field)!.delete(strValue);
				} else {
					const map = nonUniqueMaps.get(field)!;
					const set = map.get(strValue);
					if (set) {
						set.delete(id);
						if (set.size === 0) map.delete(strValue);
					}
				}
			}
		};

		return {
			get: (id) => transport.get(id),

			getAll: (pagination?: PaginationParams | undefined) =>
				transport.getAll(pagination),

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
						const firstId = ids.values().next().value as string;
						return yield* transport.get(firstId);
					}
					return yield* Effect.fail(
						new StorageOperationError({
							message: `No index on field "${field}" for entity "${config.entityName}"`,
						}),
					);
				}),

			findAllByIndex: (
				field,
				value,
				pagination?: PaginationParams | undefined,
			) =>
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
						const all = data !== undefined ? [data] : [];
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
