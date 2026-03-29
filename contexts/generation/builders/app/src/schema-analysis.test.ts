import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "@morphdsl/domain-schema";

import { analyzeSchemaFeatures } from "./schema-analysis";

const makeSchema = (
	contexts: Record<string, ContextDef>,
): DomainSchema => ({
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

describe("analyzeSchemaFeatures", () => {
	test("detects entities", () => {
		const schema = makeSchema({
			todos: emptyContext({
				entities: {
					Todo: {
						description: "A todo",
						attributes: {
							title: {
								description: "Title",
								type: { kind: "primitive", name: "string" },
							},
						},
						relationships: [],
					},
				},
			} as Partial<ContextDef>),
		});
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasEntities).toBe(true);
	});

	test("detects no entities", () => {
		const schema = makeSchema({ empty: emptyContext() });
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasEntities).toBe(false);
	});

	test("detects events from commands with emits", () => {
		const schema = makeSchema({
			todos: emptyContext({
				commands: {
					createTodo: {
						description: "Create",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [{ name: "TodoCreated", description: "Created" }],
						errors: [],
						tags: [],
						uses: [{ aggregate: "Todo", access: "write" }],
					},
				},
			} as Partial<ContextDef>),
		});
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasEvents).toBe(true);
	});

	test("detects no events when no commands", () => {
		const schema = makeSchema({
			todos: emptyContext({
				queries: {
					listTodos: {
						description: "List",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: [],
						uses: [],
					},
				},
			} as Partial<ContextDef>),
		});
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasEvents).toBe(false);
	});

	test("finds primary context", () => {
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
		const features = analyzeSchemaFeatures(schema);
		expect(features.primaryContext).toBe("todos");
	});

	test("no auth by default", () => {
		const schema = makeSchema({ empty: emptyContext() });
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasAuth).toBe(false);
	});

	test("no property tests by default", () => {
		const schema = makeSchema({ empty: emptyContext() });
		const features = analyzeSchemaFeatures(schema);
		expect(features.hasPropertyTests).toBe(false);
	});
});
