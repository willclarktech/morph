import type { ConditionExpr, ValueExpr } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { compileSmtCondition, compileSmtValue } from "./smt-compiler";

describe("compileSmtValue", () => {
	test("field with entity variable", () => {
		const expr: ValueExpr = { kind: "field", path: "todo.title" };
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("todo_title");
	});

	test("field with 'this' prefix", () => {
		const expr: ValueExpr = { kind: "field", path: "this.title" };
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("todo_title");
	});

	test("field with context prefix", () => {
		const expr: ValueExpr = { kind: "field", path: "context.currentUser.id" };
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("ctx_currentUser_id");
	});

	test("field with currentUser prefix", () => {
		const expr: ValueExpr = { kind: "field", path: "currentUser.id" };
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("ctx_currentUser_id");
	});

	test("field with input prefix", () => {
		const expr: ValueExpr = { kind: "field", path: "input.userId" };
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("input_userId");
	});

	test("integer literal", () => {
		const expr: ValueExpr = { kind: "literal", value: 42 };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("42");
	});

	test("negative integer literal", () => {
		const expr: ValueExpr = { kind: "literal", value: -5 };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("(- 5)");
	});

	test("boolean literal true", () => {
		const expr: ValueExpr = { kind: "literal", value: true };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("true");
	});

	test("boolean literal false", () => {
		const expr: ValueExpr = { kind: "literal", value: false };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("false");
	});

	test("string literal", () => {
		const expr: ValueExpr = { kind: "literal", value: "hello" };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("|str_hello|");
	});

	test("empty string literal", () => {
		const expr: ValueExpr = { kind: "literal", value: "" };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("|str_|");
	});

	test("variable", () => {
		const expr: ValueExpr = { kind: "variable", name: "item" };
		expect(compileSmtValue(expr, "e", "ctx")).toBe("item");
	});

	test("call expression", () => {
		const expr: ValueExpr = {
			kind: "call",
			name: "isValid",
			args: [
				{ kind: "field", path: "todo.title" },
				{ kind: "literal", value: 10 },
			],
		};
		expect(compileSmtValue(expr, "todo", "ctx")).toBe(
			"(isValid todo_title 10)",
		);
	});

	test("count expression", () => {
		const expr: ValueExpr = {
			kind: "count",
			collection: { kind: "field", path: "todo.items" },
		};
		expect(compileSmtValue(expr, "todo", "ctx")).toBe("todo_items_len");
	});
});

describe("compileSmtCondition", () => {
	test("equals", () => {
		const expr: ConditionExpr = {
			kind: "equals",
			left: { kind: "field", path: "todo.status" },
			right: { kind: "literal", value: "active" },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(= todo_status |str_active|)",
		);
	});

	test("notEquals", () => {
		const expr: ConditionExpr = {
			kind: "notEquals",
			left: { kind: "field", path: "todo.title" },
			right: { kind: "literal", value: "" },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(distinct todo_title |str_|)",
		);
	});

	test("greaterThan", () => {
		const expr: ConditionExpr = {
			kind: "greaterThan",
			left: { kind: "field", path: "todo.priority" },
			right: { kind: "literal", value: 0 },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(> todo_priority 0)",
		);
	});

	test("greaterThanOrEqual", () => {
		const expr: ConditionExpr = {
			kind: "greaterThanOrEqual",
			left: { kind: "field", path: "todo.priority" },
			right: { kind: "literal", value: 1 },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(>= todo_priority 1)",
		);
	});

	test("lessThan", () => {
		const expr: ConditionExpr = {
			kind: "lessThan",
			left: { kind: "field", path: "todo.priority" },
			right: { kind: "literal", value: 10 },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(< todo_priority 10)",
		);
	});

	test("lessThanOrEqual", () => {
		const expr: ConditionExpr = {
			kind: "lessThanOrEqual",
			left: { kind: "field", path: "todo.priority" },
			right: { kind: "literal", value: 10 },
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(<= todo_priority 10)",
		);
	});

	test("not", () => {
		const expr: ConditionExpr = {
			kind: "not",
			condition: {
				kind: "equals",
				left: { kind: "field", path: "todo.done" },
				right: { kind: "literal", value: true },
			},
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(not (= todo_done true))",
		);
	});

	test("and", () => {
		const expr: ConditionExpr = {
			kind: "and",
			conditions: [
				{
					kind: "greaterThan",
					left: { kind: "field", path: "todo.priority" },
					right: { kind: "literal", value: 0 },
				},
				{
					kind: "notEquals",
					left: { kind: "field", path: "todo.title" },
					right: { kind: "literal", value: "" },
				},
			],
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(and (> todo_priority 0) (distinct todo_title |str_|))",
		);
	});

	test("and with single condition returns unwrapped", () => {
		const expr: ConditionExpr = {
			kind: "and",
			conditions: [
				{
					kind: "greaterThan",
					left: { kind: "field", path: "todo.priority" },
					right: { kind: "literal", value: 0 },
				},
			],
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(> todo_priority 0)",
		);
	});

	test("and with no conditions returns true", () => {
		const expr: ConditionExpr = {
			kind: "and",
			conditions: [],
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe("true");
	});

	test("or", () => {
		const expr: ConditionExpr = {
			kind: "or",
			conditions: [
				{
					kind: "equals",
					left: { kind: "field", path: "todo.status" },
					right: { kind: "literal", value: "active" },
				},
				{
					kind: "equals",
					left: { kind: "field", path: "todo.status" },
					right: { kind: "literal", value: "pending" },
				},
			],
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(or (= todo_status |str_active|) (= todo_status |str_pending|))",
		);
	});

	test("or with no conditions returns false", () => {
		const expr: ConditionExpr = {
			kind: "or",
			conditions: [],
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe("false");
	});

	test("implies", () => {
		const expr: ConditionExpr = {
			kind: "implies",
			if: {
				kind: "equals",
				left: { kind: "field", path: "todo.status" },
				right: { kind: "literal", value: "done" },
			},
			then: {
				kind: "greaterThan",
				left: { kind: "field", path: "todo.completedAt" },
				right: { kind: "literal", value: 0 },
			},
		};
		expect(compileSmtCondition(expr, "todo", "ctx")).toBe(
			"(=> (= todo_status |str_done|) (> todo_completedAt 0))",
		);
	});

	test("contains desugars to finite disjunction", () => {
		const expr: ConditionExpr = {
			kind: "contains",
			collection: { kind: "field", path: "todo.tags" },
			value: { kind: "literal", value: "urgent" },
		};
		const result = compileSmtCondition(expr, "todo", "ctx");
		expect(result).toStartWith("(or ");
		expect(result).toContain("(= |str_urgent| todo_tags_0)");
		expect(result).toContain("(>= todo_tags_len 1)");
		expect(result).toContain("(>= todo_tags_len 5)");
	});

	test("forAll desugars to bounded conjunction", () => {
		const expr: ConditionExpr = {
			kind: "forAll",
			collection: { kind: "field", path: "todo.items" },
			variable: "item",
			condition: {
				kind: "greaterThan",
				left: { kind: "variable", name: "item" },
				right: { kind: "literal", value: 0 },
			},
		};
		const result = compileSmtCondition(expr, "todo", "ctx");
		expect(result).toStartWith("(and ");
		expect(result).toContain("(=> (>= todo_items_len 1) (> todo_items_0 0))");
		expect(result).toContain("(=> (>= todo_items_len 5) (> todo_items_4 0))");
	});

	test("exists desugars to bounded disjunction", () => {
		const expr: ConditionExpr = {
			kind: "exists",
			collection: { kind: "field", path: "todo.items" },
			variable: "item",
			condition: {
				kind: "equals",
				left: { kind: "variable", name: "item" },
				right: { kind: "literal", value: 0 },
			},
		};
		const result = compileSmtCondition(expr, "todo", "ctx");
		expect(result).toStartWith("(or ");
		expect(result).toContain("(and (>= todo_items_len 1) (= todo_items_0 0))");
		expect(result).toContain("(and (>= todo_items_len 5) (= todo_items_4 0))");
	});
});
