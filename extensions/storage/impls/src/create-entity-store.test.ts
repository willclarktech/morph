import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import type { EntityStoreConfig, StorageTransport } from "@morph/storage-dsl";

import { createEntityStore } from "./create-entity-store";

const createMemoryTransport = (): StorageTransport => {
	const store = new Map<string, string>();
	return {
		get: (id) => Effect.succeed(store.get(id)),
		getAll: () =>
			Effect.succeed({ items: [...store.values()], total: store.size }),
		put: (id, data) =>
			Effect.sync(() => {
				store.set(id, data);
			}),
		remove: (id) =>
			Effect.sync(() => {
				store.delete(id);
			}),
	};
};

const run = <A>(effect: Effect.Effect<A, unknown>) =>
	Effect.runPromise(effect.pipe(Effect.orDie));

const mkEntity = (id: string, fields: Record<string, unknown>) =>
	JSON.stringify({ id, ...fields });

describe("createEntityStore", () => {
	const baseConfig: EntityStoreConfig = {
		entityName: "TestEntity",
		tableName: "test_entities",
		indexes: [],
	};

	test("delegates get to transport", async () => {
		const transport = createMemoryTransport();
		const val = mkEntity("k1", { name: "test" });
		await run(transport.put("k1", val));
		const store = await run(createEntityStore(baseConfig, transport));
		expect(await run(store.get("k1"))).toBe(val);
		expect(await run(store.get("missing"))).toBeUndefined();
	});

	test("delegates getAll to transport", async () => {
		const transport = createMemoryTransport();
		const v1 = mkEntity("a", { name: "one" });
		const v2 = mkEntity("b", { name: "two" });
		await run(transport.put("a", v1));
		await run(transport.put("b", v2));
		const store = await run(createEntityStore(baseConfig, transport));
		const result = await run(store.getAll());
		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(2);
		expect([...result.items]).toContain(v1);
		expect([...result.items]).toContain(v2);
	});

	test("put stores and updates data", async () => {
		const transport = createMemoryTransport();
		const store = await run(createEntityStore(baseConfig, transport));
		const v1 = mkEntity("x", { val: 1 });
		const v2 = mkEntity("x", { val: 2 });
		await run(store.put("x", v1));
		expect(await run(store.get("x"))).toBe(v1);
		await run(store.put("x", v2));
		expect(await run(store.get("x"))).toBe(v2);
	});

	test("remove deletes data", async () => {
		const transport = createMemoryTransport();
		const store = await run(createEntityStore(baseConfig, transport));
		const val = mkEntity("x", { name: "test" });
		await run(store.put("x", val));
		await run(store.remove("x"));
		expect(await run(store.get("x"))).toBeUndefined();
	});

	describe("unique indexes", () => {
		const config: EntityStoreConfig = {
			entityName: "User",
			tableName: "users",
			indexes: [{ field: "email", kind: "unique" }],
		};

		test("findByIndex returns entity by unique field", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const entity = mkEntity("u1", { email: "a@b.com" });
			await run(store.put("u1", entity));
			const found = await run(store.findByIndex("email", "a@b.com"));
			expect(found).toBe(entity);
		});

		test("findByIndex returns undefined for missing value", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const found = await run(store.findByIndex("email", "missing@b.com"));
			expect(found).toBeUndefined();
		});

		test("put overwrites unique index entry", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const e1 = mkEntity("u1", { email: "old@b.com" });
			const e2 = mkEntity("u1", { email: "new@b.com" });
			await run(store.put("u1", e1));
			await run(store.put("u1", e2));
			expect(
				await run(store.findByIndex("email", "old@b.com")),
			).toBeUndefined();
			expect(await run(store.findByIndex("email", "new@b.com"))).toBe(e2);
		});

		test("remove clears unique index", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const entity = mkEntity("u1", { email: "a@b.com" });
			await run(store.put("u1", entity));
			await run(store.remove("u1"));
			expect(await run(store.findByIndex("email", "a@b.com"))).toBeUndefined();
		});
	});

	describe("non-unique indexes", () => {
		const config: EntityStoreConfig = {
			entityName: "Task",
			tableName: "tasks",
			indexes: [{ field: "status", kind: "nonUnique" }],
		};

		test("findAllByIndex returns matching entities", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const t1 = mkEntity("t1", { status: "open" });
			const t2 = mkEntity("t2", { status: "open" });
			const t3 = mkEntity("t3", { status: "closed" });
			await run(store.put("t1", t1));
			await run(store.put("t2", t2));
			await run(store.put("t3", t3));
			const open = await run(store.findAllByIndex("status", "open"));
			expect(open.items).toHaveLength(2);
			expect(open.total).toBe(2);
			expect([...open.items]).toContain(t1);
			expect([...open.items]).toContain(t2);
		});

		test("findAllByIndex returns empty for missing value", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const result = await run(store.findAllByIndex("status", "nonexistent"));
			expect(result.items).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		test("remove clears non-unique index entry", async () => {
			const transport = createMemoryTransport();
			const store = await run(createEntityStore(config, transport));
			const t1 = mkEntity("t1", { status: "open" });
			const t2 = mkEntity("t2", { status: "open" });
			await run(store.put("t1", t1));
			await run(store.put("t2", t2));
			await run(store.remove("t1"));
			const open = await run(store.findAllByIndex("status", "open"));
			expect(open.items).toHaveLength(1);
			expect([...open.items]).toContain(t2);
		});
	});

	describe("index rebuild on creation", () => {
		test("indexes populated from pre-existing data", async () => {
			const config: EntityStoreConfig = {
				entityName: "User",
				tableName: "users",
				indexes: [{ field: "email", kind: "unique" }],
			};
			const transport = createMemoryTransport();
			const entity = mkEntity("u1", { email: "pre@existing.com" });
			await run(transport.put("u1", entity));
			const store = await run(createEntityStore(config, transport));
			const found = await run(store.findByIndex("email", "pre@existing.com"));
			expect(found).toBe(entity);
		});
	});
});
