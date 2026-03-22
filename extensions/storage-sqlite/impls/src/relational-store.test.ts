import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { Effect } from "effect";

import { createRelationalSqliteStore } from "./relational-store";

import type { RelationalTableConfig } from "./relational-store";

const run = <T>(effect: Effect.Effect<T, unknown>) =>
	Effect.runPromise(effect.pipe(Effect.orDie) as Effect.Effect<T>);

const simpleConfig: RelationalTableConfig = {
	tableName: "items",
	fields: [
		{ name: "title", type: { kind: "string" } },
		{ name: "count", type: { kind: "float" } },
		{ name: "active", type: { kind: "boolean" } },
	],
	indexes: [],
};

const fullConfig: RelationalTableConfig = {
	tableName: "todos",
	fields: [
		{ name: "completed", type: { kind: "boolean" } },
		{
			name: "dueDate",
			type: {
				kind: "object",
				fields: [
					{ name: "date", type: { kind: "string" } },
					{ name: "timezone", type: { kind: "string" } },
				],
			},
			nullable: true,
		},
		{
			name: "priority",
			type: { kind: "union", values: ["low", "medium", "high"] },
		},
		{
			name: "tags",
			type: {
				kind: "array",
				element: { kind: "string" },
				childTable: "todo_tags",
			},
		},
		{ name: "title", type: { kind: "string" } },
		{ name: "userId", type: { kind: "id" } },
	],
	indexes: [{ kind: "nonUnique" as const, field: "userId" }],
};

describe("createRelationalSqliteStore", () => {
	const makeStore = (config: RelationalTableConfig) => {
		const db = new Database(":memory:");
		return createRelationalSqliteStore(db, config);
	};

	describe("basic CRUD", () => {
		test("put then get roundtrip", async () => {
			const store = makeStore(simpleConfig);
			const data = JSON.stringify({
				id: "1",
				title: "Hello",
				count: 42,
				active: true,
			});
			await run(store.put("1", data));
			const result = await run(store.get("1"));
			expect(result).toBeDefined();
			expect(JSON.parse(result!)).toEqual({
				id: "1",
				title: "Hello",
				count: 42,
				active: true,
			});
		});

		test("get unknown key returns undefined", async () => {
			const store = makeStore(simpleConfig);
			const result = await run(store.get("nonexistent"));
			expect(result).toBeUndefined();
		});

		test("put overwrites existing", async () => {
			const store = makeStore(simpleConfig);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "v1", count: 1, active: true }),
				),
			);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "v2", count: 2, active: false }),
				),
			);
			const result = await run(store.get("1"));
			expect(JSON.parse(result!)).toEqual({
				id: "1",
				title: "v2",
				count: 2,
				active: false,
			});
		});

		test("remove then get returns undefined", async () => {
			const store = makeStore(simpleConfig);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "x", count: 0, active: true }),
				),
			);
			await run(store.remove("1"));
			expect(await run(store.get("1"))).toBeUndefined();
		});

		test("remove nonexistent is idempotent", async () => {
			const store = makeStore(simpleConfig);
			await run(store.remove("nonexistent"));
		});

		test("getAll returns all stored values", async () => {
			const store = makeStore(simpleConfig);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "a", count: 1, active: true }),
				),
			);
			await run(
				store.put(
					"2",
					JSON.stringify({ id: "2", title: "b", count: 2, active: false }),
				),
			);
			const result = await run(store.getAll());
			expect(result.items).toHaveLength(2);
			expect(result.total).toBe(2);
			const parsed = result.items.map((s) => JSON.parse(s));
			expect(parsed.map((p: { title: string }) => p.title).sort()).toEqual([
				"a",
				"b",
			]);
		});
	});

	describe("boolean roundtrip", () => {
		test("true stores as 1, reads as true", async () => {
			const store = makeStore(simpleConfig);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "t", count: 0, active: true }),
				),
			);
			const result = JSON.parse((await run(store.get("1")))!);
			expect(result.active).toBe(true);
		});

		test("false stores as 0, reads as false", async () => {
			const store = makeStore(simpleConfig);
			await run(
				store.put(
					"1",
					JSON.stringify({ id: "1", title: "t", count: 0, active: false }),
				),
			);
			const result = JSON.parse((await run(store.get("1")))!);
			expect(result.active).toBe(false);
		});
	});

	describe("value object flattening", () => {
		test("present value object stored as flattened columns", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				dueDate: { date: "2025-01-15", timezone: "America/New_York" },
				priority: "high",
				tags: [],
				title: "Test",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.dueDate).toEqual({
				date: "2025-01-15",
				timezone: "America/New_York",
			});
		});

		test("null value object omitted from result", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "low",
				tags: [],
				title: "No due date",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.dueDate).toBeUndefined();
		});
	});

	describe("union CHECK constraint", () => {
		test("valid union value accepted", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "medium",
				tags: [],
				title: "Test",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.priority).toBe("medium");
		});

		test("invalid union value rejected", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "urgent",
				tags: [],
				title: "Test",
				userId: "u1",
			};
			const result = await Effect.runPromise(
				store.put("t1", JSON.stringify(data)).pipe(Effect.either),
			);
			expect(result._tag).toBe("Left");
		});
	});

	describe("array child table", () => {
		test("array stored and retrieved via child table", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "low",
				tags: ["work", "urgent"],
				title: "Tagged todo",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.tags).toEqual(["work", "urgent"]);
		});

		test("empty array roundtrips", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "low",
				tags: [],
				title: "No tags",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.tags).toEqual([]);
		});

		test("updating entity replaces array children", async () => {
			const store = makeStore(fullConfig);
			const v1 = {
				id: "t1",
				completed: false,
				priority: "low",
				tags: ["alpha", "beta"],
				title: "test",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(v1)));

			const v2 = { ...v1, tags: ["gamma"] };
			await run(store.put("t1", JSON.stringify(v2)));

			const result = JSON.parse((await run(store.get("t1")))!);
			expect(result.tags).toEqual(["gamma"]);
		});

		test("removing entity cascades to children", async () => {
			const store = makeStore(fullConfig);
			const data = {
				id: "t1",
				completed: false,
				priority: "low",
				tags: ["a", "b"],
				title: "test",
				userId: "u1",
			};
			await run(store.put("t1", JSON.stringify(data)));
			await run(store.remove("t1"));
			expect(await run(store.get("t1"))).toBeUndefined();
		});

		test("getAll includes array data", async () => {
			const store = makeStore(fullConfig);
			await run(
				store.put(
					"t1",
					JSON.stringify({
						id: "t1",
						completed: false,
						priority: "low",
						tags: ["x"],
						title: "a",
						userId: "u1",
					}),
				),
			);
			await run(
				store.put(
					"t2",
					JSON.stringify({
						id: "t2",
						completed: true,
						priority: "high",
						tags: ["y", "z"],
						title: "b",
						userId: "u1",
					}),
				),
			);
			const result = await run(store.getAll());
			const parsed = result.items.map((s) => JSON.parse(s));
			const t1 = parsed.find((p: { id: string }) => p.id === "t1");
			const t2 = parsed.find((p: { id: string }) => p.id === "t2");
			expect(t1.tags).toEqual(["x"]);
			expect(t2.tags).toEqual(["y", "z"]);
		});
	});

	describe("index operations", () => {
		test("findByIndex on nonUnique returns first match", async () => {
			const store = makeStore(fullConfig);
			await run(
				store.put(
					"t1",
					JSON.stringify({
						id: "t1",
						completed: false,
						priority: "low",
						tags: [],
						title: "a",
						userId: "user-1",
					}),
				),
			);
			const result = await run(store.findByIndex("userId", "user-1"));
			expect(result).toBeDefined();
			expect(JSON.parse(result!).id).toBe("t1");
		});

		test("findAllByIndex returns all matches", async () => {
			const store = makeStore(fullConfig);
			await run(
				store.put(
					"t1",
					JSON.stringify({
						id: "t1",
						completed: false,
						priority: "low",
						tags: [],
						title: "a",
						userId: "user-1",
					}),
				),
			);
			await run(
				store.put(
					"t2",
					JSON.stringify({
						id: "t2",
						completed: true,
						priority: "high",
						tags: [],
						title: "b",
						userId: "user-1",
					}),
				),
			);
			await run(
				store.put(
					"t3",
					JSON.stringify({
						id: "t3",
						completed: false,
						priority: "medium",
						tags: [],
						title: "c",
						userId: "user-2",
					}),
				),
			);
			const results = await run(store.findAllByIndex("userId", "user-1"));
			expect(results.items).toHaveLength(2);
			expect(results.total).toBe(2);
		});

		test("findByIndex on unknown field fails", async () => {
			const store = makeStore(fullConfig);
			const result = await Effect.runPromise(
				store.findByIndex("nonexistent", "val").pipe(Effect.either),
			);
			expect(result._tag).toBe("Left");
		});
	});

	describe("discriminated union (STI)", () => {
		const stiConfig: RelationalTableConfig = {
			tableName: "shapes",
			fields: [
				{
					name: "shape",
					type: {
						kind: "discriminated",
						discriminator: "kind",
						variants: {
							circle: [{ name: "radius", type: { kind: "float" } }],
							rectangle: [
								{ name: "width", type: { kind: "float" } },
								{ name: "height", type: { kind: "float" } },
							],
						},
					},
				},
			],
			indexes: [],
		};

		test("circle variant roundtrip", async () => {
			const store = makeStore(stiConfig);
			const data = { id: "s1", shape: { kind: "circle", radius: 5 } };
			await run(store.put("s1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("s1")))!);
			expect(result.shape).toEqual({ kind: "circle", radius: 5 });
		});

		test("rectangle variant roundtrip", async () => {
			const store = makeStore(stiConfig);
			const data = {
				id: "s2",
				shape: { kind: "rectangle", width: 10, height: 20 },
			};
			await run(store.put("s2", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("s2")))!);
			expect(result.shape).toEqual({
				kind: "rectangle",
				width: 10,
				height: 20,
			});
		});
	});

	describe("schema reconciliation", () => {
		test("creates table on first use", () => {
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, simpleConfig);
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table'",
				)
				.all()
				.map((t) => t.name);
			expect(tables).toContain("items");
		});

		test("creates child tables", () => {
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, fullConfig);
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table'",
				)
				.all()
				.map((t) => t.name);
			expect(tables).toContain("todos");
			expect(tables).toContain("todo_tags");
		});

		test("creates indexes", () => {
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, fullConfig);
			const indexes = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'",
				)
				.all()
				.map((i) => i.name);
			expect(indexes).toContain("idx_todos_user_id");
		});

		test("column names use snake_case with __ nesting", () => {
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, fullConfig);
			const cols = db
				.query<{ name: string }, []>("PRAGMA table_info(todos)")
				.all()
				.map((c) => c.name);
			expect(cols).toContain("id");
			expect(cols).toContain("user_id");
			expect(cols).toContain("due_date__date");
			expect(cols).toContain("due_date__timezone");
			expect(cols).not.toContain("userId");
			expect(cols).not.toContain("dueDate_date");
		});

		test("child table uses parent_id column", () => {
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, fullConfig);
			const cols = db
				.query<{ name: string }, []>("PRAGMA table_info(todo_tags)")
				.all()
				.map((c) => c.name);
			expect(cols).toContain("parent_id");
			expect(cols).not.toContain("parentId");
		});

		test("discriminated union columns use __ nesting", () => {
			const stiConfig: RelationalTableConfig = {
				tableName: "shapes",
				fields: [
					{
						name: "shape",
						type: {
							kind: "discriminated",
							discriminator: "kind",
							variants: {
								circle: [{ name: "radius", type: { kind: "float" } }],
								rectangle: [
									{ name: "width", type: { kind: "float" } },
									{ name: "height", type: { kind: "float" } },
								],
							},
						},
					},
				],
				indexes: [],
			};
			const db = new Database(":memory:");
			createRelationalSqliteStore(db, stiConfig);
			const cols = db
				.query<{ name: string }, []>("PRAGMA table_info(shapes)")
				.all()
				.map((c) => c.name);
			expect(cols).toContain("shape__kind");
			expect(cols).toContain("shape__circle__radius");
			expect(cols).toContain("shape__rectangle__width");
			expect(cols).toContain("shape__rectangle__height");
			expect(cols).not.toContain("shape_kind");
			expect(cols).not.toContain("shape_circle_radius");
		});

		test("adds new columns to existing table", () => {
			const db = new Database(":memory:");
			db.run("CREATE TABLE items (id TEXT PRIMARY KEY, title TEXT NOT NULL)");
			const extendedConfig: RelationalTableConfig = {
				...simpleConfig,
				fields: [
					...simpleConfig.fields,
					{ name: "extra", type: { kind: "string" }, nullable: true },
				],
			};
			createRelationalSqliteStore(db, extendedConfig);
			const cols = db
				.query<{ name: string }, []>("PRAGMA table_info(items)")
				.all()
				.map((c) => c.name);
			expect(cols).toContain("extra");
		});

		test("adds NOT NULL column with default to existing rows", async () => {
			const db = new Database(":memory:");
			const store1 = createRelationalSqliteStore(db, simpleConfig);
			await run(
				store1.put(
					"1",
					JSON.stringify({ id: "1", title: "old", count: 1, active: true }),
				),
			);
			const extendedConfig: RelationalTableConfig = {
				...simpleConfig,
				fields: [
					...simpleConfig.fields,
					{ name: "extra", type: { kind: "string" } },
				],
			};
			const store2 = createRelationalSqliteStore(db, extendedConfig);
			const result = await run(store2.get("1"));
			expect(result).toBeDefined();
			const parsed = JSON.parse(result!);
			expect(parsed.extra).toBe("");
		});

		test("WAL mode is enabled", () => {
			const tmpPath = `${import.meta.dir}/test-wal-${Date.now()}.db`;
			const db = new Database(tmpPath, { create: true });
			try {
				createRelationalSqliteStore(db, simpleConfig);
				const mode = db
					.query<{ journal_mode: string }, []>("PRAGMA journal_mode")
					.get();
				expect(mode?.journal_mode).toBe("wal");
			} finally {
				db.close();
				try {
					require("fs").unlinkSync(tmpPath);
				} catch {}
				try {
					require("fs").unlinkSync(`${tmpPath}-wal`);
				} catch {}
				try {
					require("fs").unlinkSync(`${tmpPath}-shm`);
				} catch {}
			}
		});
	});

	describe("identifier quoting", () => {
		test("table name that is a SQL keyword", async () => {
			const keywordConfig: RelationalTableConfig = {
				tableName: "order",
				fields: [
					{ name: "status", type: { kind: "string" } },
					{ name: "total", type: { kind: "float" } },
				],
				indexes: [],
			};
			const store = makeStore(keywordConfig);
			const data = { id: "o1", status: "pending", total: 42.5 };
			await run(store.put("o1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("o1")))!);
			expect(result).toEqual({ id: "o1", status: "pending", total: 42.5 });
		});

		test("union value with single quote", async () => {
			const quoteConfig: RelationalTableConfig = {
				tableName: "items",
				fields: [
					{
						name: "label",
						type: {
							kind: "union",
							values: ["it's", "normal"],
						},
					},
				],
				indexes: [],
			};
			const store = makeStore(quoteConfig);
			const data = { id: "1", label: "it's" };
			await run(store.put("1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("1")))!);
			expect(result.label).toBe("it's");
		});
	});

	describe("variant field scoping", () => {
		test("variants with same field name produce distinct columns", async () => {
			const config: RelationalTableConfig = {
				tableName: "events",
				fields: [
					{
						name: "payload",
						type: {
							kind: "discriminated",
							discriminator: "type",
							variants: {
								click: [
									{ name: "x", type: { kind: "float" } },
									{ name: "y", type: { kind: "float" } },
								],
								scroll: [
									{ name: "x", type: { kind: "float" } },
									{ name: "y", type: { kind: "float" } },
								],
							},
						},
					},
				],
				indexes: [],
			};
			const store = makeStore(config);
			const data = { id: "e1", payload: { type: "click", x: 10, y: 20 } };
			await run(store.put("e1", JSON.stringify(data)));
			const result = JSON.parse((await run(store.get("e1")))!);
			expect(result.payload).toEqual({ type: "click", x: 10, y: 20 });
		});
	});
});
