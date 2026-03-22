import { describe, expect, test } from "bun:test";

import type { DomainSchema } from "@morph/domain-schema";

import { generateSchemas } from "./schemas";

const makeSchema = (contexts: DomainSchema["contexts"]): DomainSchema => ({
	name: "Test",
	contexts,
});

const entityOnlySchema = makeSchema({
	main: {
		description: "test",
		entities: {
			Todo: {
				description: "A todo item",
				attributes: {
					title: {
						description: "Title",
						type: { kind: "primitive", name: "string" },
					},
					completed: {
						description: "Completed",
						type: { kind: "primitive", name: "boolean" },
					},
				},
				relationships: [],
			},
		},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

const withEventsSchema = makeSchema({
	main: {
		description: "test",
		entities: {
			Todo: {
				description: "A todo item",
				attributes: {
					title: {
						description: "Title",
						type: { kind: "primitive", name: "string" },
					},
				},
				relationships: [],
			},
		},
		commands: {
			createTodo: {
				description: "Create a todo",
				input: {
					title: {
						description: "Title",
						type: { kind: "primitive", name: "string" },
					},
				},
				output: { kind: "entity", name: "Todo" },
				emits: [{ name: "TodoCreated", description: "Todo was created" }],
				errors: [],
				tags: [],
				uses: [{ aggregate: "Todo", access: "write" }],
			},
		},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

const valueObjectSchema = makeSchema({
	main: {
		description: "test",
		entities: {
			Order: {
				description: "An order",
				attributes: {
					total: {
						description: "Total",
						type: { kind: "valueObject", name: "Money" },
					},
				},
				relationships: [],
			},
		},
		valueObjects: {
			Money: {
				description: "Money value",
				attributes: {
					amount: {
						description: "Amount",
						type: { kind: "primitive", name: "float" },
					},
					currency: {
						description: "Currency",
						type: { kind: "primitive", name: "string" },
					},
				},
			},
		},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

describe("generateSchemas", () => {
	test("returns empty string for empty schema", () => {
		const schema = makeSchema({
			main: {
				description: "empty",
				entities: {},
				commands: {},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		expect(generateSchemas(schema)).toBe("");
	});

	test("includes Effect/Schema import", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain('import * as S from "effect/Schema"');
	});

	test("generates branded ID schema for entity", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain("export const TodoIdSchema = S.String.pipe(");
		expect(result).toContain('S.brand("TodoId")');
		expect(result).toContain(
			"export type TodoId = S.Schema.Type<typeof TodoIdSchema>",
		);
	});

	test("generates ID constructor function", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain(
			"export const todoId = (id: string): TodoId => id as TodoId",
		);
	});

	test("generates entity schema as S.Struct", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain("export const TodoSchema = S.Struct({");
		expect(result).toContain("id: TodoIdSchema,");
		expect(result).toContain("title: S.String,");
		expect(result).toContain("completed: S.Boolean,");
	});

	test("generates entity type alias", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain(
			"export type Todo = S.Schema.Type<typeof TodoSchema>",
		);
	});

	test("generates parse and encode helpers", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).toContain(
			"export const parseTodo = S.decodeUnknownSync(TodoSchema)",
		);
		expect(result).toContain(
			"export const parseTodoEither = S.decodeUnknownEither(TodoSchema)",
		);
		expect(result).toContain(
			"export const encodeTodo = S.encodeSync(TodoSchema)",
		);
	});

	test("generates value object schema without id field", () => {
		const result = generateSchemas(valueObjectSchema);
		expect(result).toContain("export const MoneySchema = S.Struct({");
		expect(result).toContain("amount: S.Number,");
		expect(result).toContain("currency: S.String,");
		expect(result).not.toContain("MoneyIdSchema");
	});

	test("value objects section comes before entities", () => {
		const result = generateSchemas(valueObjectSchema);
		const voIndex = result.indexOf("Value Object Schemas");
		const entityIndex = result.indexOf("Entity Schemas");
		expect(voIndex).toBeLessThan(entityIndex);
	});

	test("generates event schemas", () => {
		const result = generateSchemas(withEventsSchema);
		expect(result).toContain("export const CreateTodoInputSchema = S.Struct({");
		expect(result).toContain("title: S.String,");
		expect(result).toContain(
			"export const TodoCreatedEventSchema = S.Struct({",
		);
		expect(result).toContain('_tag: S.Literal("TodoCreated")');
		expect(result).toContain("occurredAt: S.String,");
		expect(result).toContain("params: CreateTodoInputSchema,");
	});

	test("generates DomainEvent base interface when events exist", () => {
		const result = generateSchemas(withEventsSchema);
		expect(result).toContain("export interface DomainEvent {");
		expect(result).toContain("readonly _tag: string;");
		expect(result).toContain("readonly occurredAt: string;");
	});

	test("no DomainEvent interface without events", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result).not.toContain("DomainEvent");
	});

	test("handles optional entity attributes", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {
					Todo: {
						description: "A todo",
						attributes: {
							note: {
								description: "Note",
								type: { kind: "primitive", name: "string" },
								optional: true,
							},
						},
						relationships: [],
					},
				},
				commands: {},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		const result = generateSchemas(schema);
		expect(result).toContain("note: S.optional(S.String)");
	});

	test("ends with trailing newline", () => {
		const result = generateSchemas(entityOnlySchema);
		expect(result.endsWith("\n")).toBe(true);
	});

	test("filters by contextName option", () => {
		const multiContextSchema = makeSchema({
			first: {
				description: "first",
				entities: {
					Alpha: {
						description: "Alpha",
						attributes: {},
						relationships: [],
					},
				},
				commands: {},
				queries: {},
				invariants: [],
				dependencies: [],
			},
			second: {
				description: "second",
				entities: {
					Beta: {
						description: "Beta",
						attributes: {},
						relationships: [],
					},
				},
				commands: {},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		const result = generateSchemas(multiContextSchema, {
			contextName: "first",
		});
		expect(result).toContain("AlphaSchema");
		expect(result).not.toContain("BetaSchema");
	});

	test("generates multiple entities from same context", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {
					User: {
						description: "A user",
						attributes: {
							name: {
								description: "Name",
								type: { kind: "primitive", name: "string" },
							},
						},
						relationships: [],
					},
					Post: {
						description: "A post",
						attributes: {
							title: {
								description: "Title",
								type: { kind: "primitive", name: "string" },
							},
						},
						relationships: [],
					},
				},
				commands: {},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		const result = generateSchemas(schema);
		expect(result).toContain("UserSchema");
		expect(result).toContain("PostSchema");
		expect(result).toContain("UserIdSchema");
		expect(result).toContain("PostIdSchema");
	});
});
