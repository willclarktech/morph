import type { PaginationParams, StorageTransport } from "@morph/storage-dsl";

import { applyPagination } from "@morph/storage-dsl";
import { Effect, Ref } from "effect";

/**
 * Create an in-memory StorageTransport backed by a Ref<Map>.
 * Suitable for testing and development.
 */
export const createMemoryTransport = (): Effect.Effect<StorageTransport> =>
	Effect.gen(function* () {
		const store = yield* Ref.make(new Map<string, string>());

		return {
			get: (id) => Ref.get(store).pipe(Effect.map((m) => m.get(id))),
			getAll: (pagination?: PaginationParams) =>
				Ref.get(store).pipe(
					Effect.map((m) => applyPagination([...m.values()], pagination)),
				),
			put: (id, data) => Ref.update(store, (m) => new Map(m).set(id, data)),
			remove: (id) =>
				Ref.update(store, (m) => {
					const next = new Map(m);
					next.delete(id);
					return next;
				}),
		};
	});
