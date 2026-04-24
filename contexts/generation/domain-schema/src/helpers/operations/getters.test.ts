import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "../../schemas";

import {
	getAllCommands,
	getAllFunctions,
	getAllOperations,
	getAllQueries,
	getFunctionsFlat,
	getOperationsFlat,
} from "./getters";

const makeSchema = (contexts: Record<string, ContextDef>): DomainSchema => ({
	name: "test",
	contexts,
});

const emptyContext = (overrides?: Partial<ContextDef>): ContextDef => ({
	description: "test",
	entities: {},
	commands: {},
	contracts: [],
	queries: {},
	invariants: [],
	dependencies: [],
	...overrides,
});

const makeCommand = (desc: string) => ({
	description: desc,
	input: {},
	output: { kind: "primitive" as const, name: "void" as const },
	emits: [],
	errors: [],
	tags: [],
	uses: [{ aggregate: "Todo", access: "write" as const }],
});

const makeQuery = (desc: string) => ({
	description: desc,
	input: {},
	output: { kind: "primitive" as const, name: "string" as const },
	errors: [],
	tags: [],
	uses: [{ aggregate: "Todo", access: "read" as const }],
});

const makeFunction = (desc: string) => ({
	description: desc,
	input: {},
	output: { kind: "primitive" as const, name: "string" as const },
	errors: [],
	tags: [],
});

describe("getAllCommands", () => {
	test("returns all commands across contexts", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: {
					createTodo: makeCommand("Create"),
					deleteTodo: makeCommand("Delete"),
				},
			}),
			users: emptyContext({
				commands: {
					createUser: makeCommand("Create user"),
				},
			}),
		});
		const commands = getAllCommands(schema);
		expect(commands).toHaveLength(3);
		expect(commands.map((c) => c.name).sort()).toEqual([
			"createTodo",
			"createUser",
			"deleteTodo",
		]);
	});

	test("includes context name in each entry", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: { createTodo: makeCommand("Create") },
			}),
		});
		const [entry] = getAllCommands(schema);
		expect(entry!.context).toBe("todos");
		expect(entry!.name).toBe("createTodo");
	});

	test("returns empty array when no commands exist", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getAllCommands(schema)).toEqual([]);
	});
});

describe("getAllQueries", () => {
	test("returns all queries across contexts", () => {
		const schema = makeSchema({
			todos: emptyContext({
				queries: { listTodos: makeQuery("List") },
			}),
			users: emptyContext({
				queries: { getUser: makeQuery("Get user") },
			}),
		});
		const queries = getAllQueries(schema);
		expect(queries).toHaveLength(2);
		expect(queries.map((q) => q.name).sort()).toEqual(["getUser", "listTodos"]);
	});

	test("returns empty array when no queries exist", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getAllQueries(schema)).toEqual([]);
	});
});

describe("getAllOperations", () => {
	test("combines commands and queries", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: { createTodo: makeCommand("Create") },
				queries: { listTodos: makeQuery("List") },
			}),
		});
		const ops = getAllOperations(schema);
		expect(ops).toHaveLength(2);
		expect(ops.map((o) => o.name).sort()).toEqual(["createTodo", "listTodos"]);
	});

	test("returns empty for context with no operations", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getAllOperations(schema)).toEqual([]);
	});
});

describe("getAllFunctions", () => {
	test("returns all functions across contexts", () => {
		const schema = makeSchema({
			compute: emptyContext({
				functions: {
					transform: makeFunction("Transform"),
					validate: makeFunction("Validate"),
				},
			}),
		});
		const fns = getAllFunctions(schema);
		expect(fns).toHaveLength(2);
		expect(fns.map((f) => f.name).sort()).toEqual(["transform", "validate"]);
	});

	test("returns empty when context has no functions", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getAllFunctions(schema)).toEqual([]);
	});

	test("includes context name", () => {
		const schema = makeSchema({
			compute: emptyContext({
				functions: { calc: makeFunction("Calc") },
			}),
		});
		const [entry] = getAllFunctions(schema);
		expect(entry!.context).toBe("compute");
	});
});

describe("getOperationsFlat", () => {
	test("returns flat map of name to definition", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: { createTodo: makeCommand("Create") },
				queries: { listTodos: makeQuery("List") },
			}),
		});
		const flat = getOperationsFlat(schema);
		expect(Object.keys(flat).sort()).toEqual(["createTodo", "listTodos"]);
		expect(flat["createTodo"]!.description).toBe("Create");
	});

	test("returns empty object for no operations", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getOperationsFlat(schema)).toEqual({});
	});
});

describe("getFunctionsFlat", () => {
	test("returns flat map of name to definition", () => {
		const schema = makeSchema({
			compute: emptyContext({
				functions: { calc: makeFunction("Calc") },
			}),
		});
		const flat = getFunctionsFlat(schema);
		expect(Object.keys(flat)).toEqual(["calc"]);
		expect(flat["calc"]!.description).toBe("Calc");
	});

	test("returns empty object for no functions", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getFunctionsFlat(schema)).toEqual({});
	});
});
