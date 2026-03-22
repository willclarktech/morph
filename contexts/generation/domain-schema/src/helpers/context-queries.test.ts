import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "../schemas";

import {
	findPrimaryContext,
	getContextOperationsWithTag,
	getContextsWithTag,
	hasPropertyTests,
} from "./context-queries";

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

describe("getContextOperationsWithTag", () => {
	test("returns commands with matching tag", () => {
		const ctx = emptyContext({
			commands: {
				createTodo: {
					description: "Create",
					input: {},
					output: { kind: "primitive", name: "void" },
					emits: [],
					errors: [],
					tags: ["@api"],
					uses: [],
				},
			},
		} as Partial<ContextDef>);
		expect(getContextOperationsWithTag(ctx, "@api")).toEqual(["createTodo"]);
	});

	test("returns queries with matching tag", () => {
		const ctx = emptyContext({
			queries: {
				listTodos: {
					description: "List",
					input: {},
					output: { kind: "primitive", name: "string" },
					errors: [],
					tags: ["@cli"],
					uses: [],
				},
			},
		} as Partial<ContextDef>);
		expect(getContextOperationsWithTag(ctx, "@cli")).toEqual(["listTodos"]);
	});

	test("returns functions with matching tag", () => {
		const ctx = emptyContext({
			functions: {
				transform: {
					description: "Transform",
					input: {},
					output: { kind: "primitive", name: "string" },
					errors: [],
					tags: ["@api"],
				},
			},
		} as Partial<ContextDef>);
		expect(getContextOperationsWithTag(ctx, "@api")).toEqual(["transform"]);
	});

	test("returns empty array when no operations match", () => {
		const ctx = emptyContext({
			commands: {
				createTodo: {
					description: "Create",
					input: {},
					output: { kind: "primitive", name: "void" },
					emits: [],
					errors: [],
					tags: ["@cli"],
					uses: [],
				},
			},
		} as Partial<ContextDef>);
		expect(getContextOperationsWithTag(ctx, "@api")).toEqual([]);
	});

	test("returns empty array for context with no operations", () => {
		expect(getContextOperationsWithTag(emptyContext(), "@api")).toEqual([]);
	});
});

describe("getContextsWithTag", () => {
	test("returns context names that have operations with the tag", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: {
					createTodo: {
						description: "Create",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: ["@api"],
						uses: [],
					},
				},
			} as Partial<ContextDef>),
			users: emptyContext(),
		});
		expect(getContextsWithTag(schema, "@api")).toEqual(["todos"]);
	});

	test("returns multiple contexts if both match", () => {
		const withApiCommand = emptyContext({
			commands: {
				op: {
					description: "Op",
					input: {},
					output: { kind: "primitive", name: "void" },
					emits: [],
					errors: [],
					tags: ["@api"],
					uses: [],
				},
			},
		} as Partial<ContextDef>);
		const schema = makeSchema({
			a: withApiCommand,
			b: withApiCommand,
		});
		expect(getContextsWithTag(schema, "@api")).toEqual(["a", "b"]);
	});

	test("returns empty array when no contexts match", () => {
		const schema = makeSchema({ a: emptyContext() });
		expect(getContextsWithTag(schema, "@api")).toEqual([]);
	});
});

describe("findPrimaryContext", () => {
	test("returns first context with commands", () => {
		const schema = makeSchema({
			empty: emptyContext(),
			todos: emptyContext({
				commands: {
					createTodo: {
						description: "Create",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [],
					},
				},
			} as Partial<ContextDef>),
		});
		expect(findPrimaryContext(schema)).toBe("todos");
	});

	test("returns first context with queries", () => {
		const schema = makeSchema({
			empty: emptyContext(),
			search: emptyContext({
				queries: {
					find: {
						description: "Find",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: [],
						uses: [],
					},
				},
			} as Partial<ContextDef>),
		});
		expect(findPrimaryContext(schema)).toBe("search");
	});

	test("returns first context with functions", () => {
		const schema = makeSchema({
			empty: emptyContext(),
			compute: emptyContext({
				functions: {
					calc: {
						description: "Calculate",
						input: {},
						output: { kind: "primitive", name: "float" },
						errors: [],
						tags: [],
					},
				},
			} as Partial<ContextDef>),
		});
		expect(findPrimaryContext(schema)).toBe("compute");
	});

	test("falls back to first context when none have operations", () => {
		const schema = makeSchema({
			alpha: emptyContext(),
			beta: emptyContext(),
		});
		expect(findPrimaryContext(schema)).toBe("alpha");
	});

	test("returns undefined for empty schema", () => {
		const schema = makeSchema({});
		expect(findPrimaryContext(schema)).toBeUndefined();
	});
});

describe("hasPropertyTests", () => {
	test("returns true when entity-scoped invariants exist", () => {
		const schema = makeSchema({
			todos: emptyContext({
				invariants: [
					{
						name: "titleNotEmpty",
						description: "Title must not be empty",
						violation: "Title cannot be empty",
						scope: { kind: "entity", entity: "Todo" },
						condition: {
							kind: "notEquals",
							left: { kind: "field", path: "title" },
							right: { kind: "literal", value: "" },
						},
					},
				],
			} as Partial<ContextDef>),
		});
		expect(hasPropertyTests(schema)).toBe(true);
	});

	test("returns true when context-scoped invariants exist", () => {
		const schema = makeSchema({
			todos: emptyContext({
				invariants: [
					{
						name: "authRule",
						description: "Auth required",
						violation: "Authentication is required",
						scope: { kind: "context" },
						condition: {
							kind: "notEquals",
							left: { kind: "field", path: "user" },
							right: { kind: "literal", value: "" },
						},
					},
				],
			} as Partial<ContextDef>),
		});
		expect(hasPropertyTests(schema)).toBe(true);
	});

	test("returns false when only operation-scoped invariants exist", () => {
		const schema = makeSchema({
			todos: emptyContext({
				invariants: [
					{
						name: "preCheck",
						description: "Pre condition",
						violation: "Pre condition failed",
						scope: { kind: "operation", operation: "createTodo", when: "pre" },
						condition: {
							kind: "notEquals",
							left: { kind: "field", path: "x" },
							right: { kind: "literal", value: "" },
						},
					},
				],
			} as Partial<ContextDef>),
		});
		expect(hasPropertyTests(schema)).toBe(false);
	});

	test("returns false when no invariants exist", () => {
		const schema = makeSchema({ todos: emptyContext() });
		expect(hasPropertyTests(schema)).toBe(false);
	});
});
