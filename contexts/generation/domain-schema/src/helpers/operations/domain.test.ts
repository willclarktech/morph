import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "../../schemas";

import {
	getDomainServiceAction,
	getOperationAggregates,
	getPrimaryWriteAggregate,
	isDomainService,
} from "./domain";

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

describe("getOperationAggregates", () => {
	test("returns uses array from command", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: {
					createTodo: {
						description: "Create",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [{ aggregate: "Todo", access: "write" }],
					},
				},
			}),
		});
		const aggs = getOperationAggregates(schema, "createTodo");
		expect(aggs).toEqual([{ aggregate: "Todo", access: "write" }]);
	});

	test("returns empty array for unknown operation", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getOperationAggregates(schema, "unknown")).toEqual([]);
	});

	test("returns multiple aggregates for domain service", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: {
					transferTodos: {
						description: "Transfer",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [
							{ aggregate: "Todo", access: "write" },
							{ aggregate: "User", access: "read" },
						],
					},
				},
			}),
		});
		const aggs = getOperationAggregates(schema, "transferTodos");
		expect(aggs).toHaveLength(2);
	});
});

describe("isDomainService", () => {
	test("returns true for operation with multiple aggregates", () => {
		const schema = makeSchema({
			ctx: emptyContext({
				commands: {
					transferTodos: {
						description: "Transfer",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [
							{ aggregate: "Todo", access: "write" },
							{ aggregate: "User", access: "read" },
						],
					},
				},
			}),
		});
		expect(isDomainService(schema, "transferTodos")).toBe(true);
	});

	test("returns false for operation with single aggregate", () => {
		const schema = makeSchema({
			ctx: emptyContext({
				commands: {
					createTodo: {
						description: "Create",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [{ aggregate: "Todo", access: "write" }],
					},
				},
			}),
		});
		expect(isDomainService(schema, "createTodo")).toBe(false);
	});

	test("returns false for unknown operation", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(isDomainService(schema, "unknown")).toBe(false);
	});
});

describe("getPrimaryWriteAggregate", () => {
	test("returns first write aggregate", () => {
		const schema = makeSchema({
			ctx: emptyContext({
				commands: {
					transferTodos: {
						description: "Transfer",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [],
						errors: [],
						tags: [],
						uses: [
							{ aggregate: "User", access: "read" },
							{ aggregate: "Todo", access: "write" },
						],
					},
				},
			}),
		});
		expect(getPrimaryWriteAggregate(schema, "transferTodos")).toBe("Todo");
	});

	test("returns undefined when no write access", () => {
		const schema = makeSchema({
			ctx: emptyContext({
				queries: {
					listTodos: {
						description: "List",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: [],
						uses: [{ aggregate: "Todo", access: "read" }],
					},
				},
			}),
		});
		expect(getPrimaryWriteAggregate(schema, "listTodos")).toBeUndefined();
	});

	test("returns undefined for unknown operation", () => {
		const schema = makeSchema({ empty: emptyContext() });
		expect(getPrimaryWriteAggregate(schema, "unknown")).toBeUndefined();
	});
});

describe("getDomainServiceAction", () => {
	test("strips plural aggregate suffix", () => {
		expect(getDomainServiceAction("transferTodos", "Todo")).toBe("transfer");
	});

	test("strips singular aggregate suffix", () => {
		expect(getDomainServiceAction("archiveUser", "User")).toBe("archive");
	});

	test("strips case-insensitively", () => {
		expect(getDomainServiceAction("reconcileData", "Data")).toBe("reconcile");
	});

	test("returns kebab-case operation name when no suffix match", () => {
		expect(getDomainServiceAction("performSync", "Todo")).toBe("perform-sync");
	});

	test("handles operation that exactly matches aggregate", () => {
		// "Todo" with aggregate "Todo" → full name in kebab since actionPart would be empty
		expect(getDomainServiceAction("Todo", "Todo")).toBe("todo");
	});

	test("converts camelCase action to kebab-case", () => {
		expect(getDomainServiceAction("bulkDeleteTodos", "Todo")).toBe(
			"bulk-delete",
		);
	});
});
