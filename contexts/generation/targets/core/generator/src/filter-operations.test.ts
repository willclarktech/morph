import type { ContextDef, DomainSchema } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { filterFunctions, filterOperations } from "./filter-operations";

const makeSchema = (contexts: Record<string, ContextDef>): DomainSchema => ({
	name: "test",
	contexts,
});

const emptyContext = (overrides?: Partial<ContextDef>): ContextDef =>
	({
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
		...overrides,
	}) as ContextDef;

describe("filterOperations", () => {
	const schema = makeSchema({
		todos: emptyContext({
			commands: {
				createTodo: {
					description: "Create",
					input: {},
					output: { kind: "primitive", name: "void" },
					emits: [],
					errors: [],
					tags: ["@api", "@cli"],
					uses: [{ aggregate: "Todo", access: "write" }],
				},
				deleteTodo: {
					description: "Delete",
					input: {},
					output: { kind: "primitive", name: "void" },
					emits: [],
					errors: [],
					tags: ["@api"],
					uses: [{ aggregate: "Todo", access: "write" }],
				},
			},
			queries: {
				listTodos: {
					description: "List",
					input: {},
					output: { kind: "primitive", name: "string" },
					errors: [],
					tags: ["@cli"],
					uses: [{ aggregate: "Todo", access: "read" }],
				},
			},
		} as Partial<ContextDef>),
	});

	test("returns all operations when tags is empty", () => {
		const result = filterOperations(schema, []);
		expect(Object.keys(result).sort()).toEqual([
			"createTodo",
			"deleteTodo",
			"listTodos",
		]);
	});

	test("filters by single tag", () => {
		const result = filterOperations(schema, ["@cli"]);
		expect(Object.keys(result).sort()).toEqual(["createTodo", "listTodos"]);
	});

	test("filters by multiple tags (OR logic)", () => {
		const result = filterOperations(schema, ["@api"]);
		expect(Object.keys(result).sort()).toEqual(["createTodo", "deleteTodo"]);
	});

	test("returns empty when no operations match tag", () => {
		const result = filterOperations(schema, ["@mcp"]);
		expect(Object.keys(result)).toEqual([]);
	});
});

describe("filterFunctions", () => {
	const schema = makeSchema({
		compute: emptyContext({
			functions: {
				transform: {
					description: "Transform",
					input: {},
					output: { kind: "primitive", name: "string" },
					errors: [],
					tags: ["@api"],
				},
				validate: {
					description: "Validate",
					input: {},
					output: { kind: "primitive", name: "boolean" },
					errors: [],
					tags: ["@cli"],
				},
			},
		} as Partial<ContextDef>),
	});

	test("returns all functions when tags is empty", () => {
		const result = filterFunctions(schema, []);
		expect(Object.keys(result).sort()).toEqual(["transform", "validate"]);
	});

	test("filters by tag", () => {
		const result = filterFunctions(schema, ["@api"]);
		expect(Object.keys(result)).toEqual(["transform"]);
	});

	test("returns empty when no functions match", () => {
		const result = filterFunctions(schema, ["@mcp"]);
		expect(Object.keys(result)).toEqual([]);
	});
});
