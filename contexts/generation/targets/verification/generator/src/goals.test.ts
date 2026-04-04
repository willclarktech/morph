import type { ContextDef, DomainSchema } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import {
	generateConsistencyCheck,
	generatePreservationCheck,
	generateSatisfiabilityCheck,
} from "./goals";

const ctx = (
	partial: Omit<
		ContextDef,
		"commands" | "contracts" | "dependencies" | "invariants" | "queries"
	> &
		Partial<
			Pick<
				ContextDef,
				"commands" | "contracts" | "dependencies" | "invariants" | "queries"
			>
		>,
): ContextDef => ({
	commands: {},
	contracts: [],
	dependencies: [],
	invariants: [],
	queries: {},
	...partial,
});

const makeSchema = (overrides?: Partial<DomainSchema>): DomainSchema => ({
	name: "test-app",
	contexts: {
		main: ctx({
			description: "Main context",
			entities: {
				Todo: {
					description: "A todo item",
					relationships: [],
					attributes: {
						title: {
							type: { kind: "primitive", name: "string" },
							description: "Title",
						},
						priority: {
							type: { kind: "primitive", name: "integer" },
							description: "Priority level",
						},
						done: {
							type: { kind: "primitive", name: "boolean" },
							description: "Completion status",
						},
					},
				},
			},
			invariants: [
				{
					name: "titleNotEmpty",
					description: "Title must not be empty",
					violation: "Title cannot be empty",
					scope: { kind: "entity", entity: "Todo" },
					condition: {
						kind: "notEquals",
						left: { kind: "field", path: "todo.title" },
						right: { kind: "literal", value: "" },
					},
				},
				{
					name: "priorityPositive",
					description: "Priority must be positive",
					violation: "Priority must be greater than 0",
					scope: { kind: "entity", entity: "Todo" },
					condition: {
						kind: "greaterThan",
						left: { kind: "field", path: "todo.priority" },
						right: { kind: "literal", value: 0 },
					},
				},
			],
		}),
	},
	...overrides,
});

const makeSchemaWithOperations = (): DomainSchema => ({
	name: "test-app",
	contexts: {
		main: ctx({
			description: "Main context",
			entities: {
				Todo: {
					description: "A todo item",
					relationships: [],
					attributes: {
						title: {
							type: { kind: "primitive", name: "string" },
							description: "Title",
						},
						done: {
							type: { kind: "primitive", name: "boolean" },
							description: "Done flag",
						},
					},
				},
			},
			invariants: [
				{
					name: "titleNotEmpty",
					description: "Title must not be empty",
					violation: "Title cannot be empty",
					scope: { kind: "entity", entity: "Todo" },
					condition: {
						kind: "notEquals",
						left: { kind: "field", path: "todo.title" },
						right: { kind: "literal", value: "" },
					},
				},
				{
					name: "inputNotEmpty",
					description: "Input title must not be empty",
					violation: "Input title required",
					scope: { kind: "operation", operation: "createTodo", when: "pre" },
					condition: {
						kind: "notEquals",
						left: { kind: "field", path: "input.title" },
						right: { kind: "literal", value: "" },
					},
				},
				{
					name: "todoCreated",
					description: "Todo was created",
					violation: "Todo creation failed",
					scope: { kind: "operation", operation: "createTodo", when: "post" },
					condition: {
						kind: "notEquals",
						left: { kind: "field", path: "todo.title" },
						right: { kind: "literal", value: "" },
					},
				},
			],
			commands: {
				createTodo: {
					description: "Create a new todo",
					input: {
						title: {
							type: { kind: "primitive", name: "string" },
							description: "Title",
						},
					},
					output: { kind: "entity", name: "Todo" },
					emits: [
						{
							name: "TodoCreated",
							description: "A todo was created",
						},
					],
					errors: [],
					tags: [],
					uses: [{ aggregate: "Todo", access: "write" as const }],
					pre: ["inputNotEmpty"],
					post: ["todoCreated"],
				},
			},
		}),
	},
});

describe("generateConsistencyCheck", () => {
	test("returns undefined for schema without invariants", () => {
		const schema: DomainSchema = {
			name: "test-app",
			contexts: {
				main: ctx({
					description: "Main context",
					entities: {
						Foo: {
							description: "Foo entity",
							relationships: [],
							attributes: {
								bar: {
									type: { kind: "primitive", name: "string" },
									description: "Bar",
								},
							},
						},
					},
				}),
			},
		};
		expect(generateConsistencyCheck(schema)).toBeUndefined();
	});

	test("generates SMT-LIB2 for entity invariants", () => {
		const result = generateConsistencyCheck(makeSchema());
		expect(result).toBeDefined();
		expect(result!.filename).toBe(
			"tests/verification/src/checks/consistency.smt2",
		);
		const content = result!.content;
		expect(content).toContain("(set-logic QF_UFLIA)");
		expect(content).toContain("(declare-sort StringId 0)");
		expect(content).toContain('(echo "consistency:Todo")');
		expect(content).toContain("(declare-const todo_title StringId)");
		expect(content).toContain("(declare-const todo_priority Int)");
		expect(content).toContain("(declare-const |str_| StringId)");
		expect(content).toContain("(assert (distinct todo_title |str_|))");
		expect(content).toContain("(assert (> todo_priority 0))");
		expect(content).toContain("(check-sat)");
		expect(content).toContain("(push 1)");
		expect(content).toContain("(pop 1)");
	});
});

describe("generateSatisfiabilityCheck", () => {
	test("returns undefined when no operations have pre-invariants", () => {
		const result = generateSatisfiabilityCheck(makeSchema());
		expect(result).toBeUndefined();
	});

	test("generates checks for operations with pre-invariants", () => {
		const result = generateSatisfiabilityCheck(makeSchemaWithOperations());
		expect(result).toBeDefined();
		expect(result!.filename).toBe(
			"tests/verification/src/checks/precondition-satisfiability.smt2",
		);
		const content = result!.content;
		expect(content).toContain("(set-logic QF_UFLIA)");
		expect(content).toContain('(echo "satisfiability:createTodo")');
		expect(content).toContain("(declare-const input_title StringId)");
		expect(content).toContain("(declare-const |str_| StringId)");
		expect(content).toContain("(assert (distinct input_title |str_|))");
		expect(content).toContain("(check-sat)");
	});
});

describe("generatePreservationCheck", () => {
	test("returns undefined when no operations have post-invariants", () => {
		const result = generatePreservationCheck(makeSchema());
		expect(result).toBeUndefined();
	});

	test("generates preservation checks with pre and post state", () => {
		const result = generatePreservationCheck(makeSchemaWithOperations());
		expect(result).toBeDefined();
		expect(result!.filename).toBe(
			"tests/verification/src/checks/preservation.smt2",
		);
		const content = result!.content;
		expect(content).toContain("(set-logic QF_UFLIA)");
		expect(content).toContain('(echo "preservation:createTodo:Todo")');
		// Pre-state declarations
		expect(content).toContain("(declare-const todo_title StringId)");
		// Post-state declarations
		expect(content).toContain("(declare-const todo_post_title StringId)");
		// Post-invariant references post-state variables
		expect(content).toContain("(assert (distinct todo_post_title |str_|))");
		// Negated entity invariant references post-state
		expect(content).toContain(
			"(assert (not (distinct todo_post_title |str_|)))",
		);
		expect(content).toContain("(check-sat)");
	});
});
