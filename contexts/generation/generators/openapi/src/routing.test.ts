import { describe, expect, test } from "bun:test";

import { parseOperationName, pluralize, toKebabCase } from "./routing";

describe("parseOperationName", () => {
	test("splits camelCase into action and resource", () => {
		expect(parseOperationName("createTodo")).toEqual({
			action: "create",
			resource: "Todo",
		});
	});

	test("handles multi-word resource", () => {
		expect(parseOperationName("deleteTodoItem")).toEqual({
			action: "delete",
			resource: "TodoItem",
		});
	});

	test("handles list action", () => {
		expect(parseOperationName("listTodos")).toEqual({
			action: "list",
			resource: "Todos",
		});
	});

	test("handles get action", () => {
		expect(parseOperationName("getUser")).toEqual({
			action: "get",
			resource: "User",
		});
	});

	test("falls back for non-matching names", () => {
		expect(parseOperationName("sync")).toEqual({
			action: "sync",
			resource: "resource",
		});
	});
});

describe("pluralize (openapi)", () => {
	test("adds s to regular words", () => {
		expect(pluralize("todo")).toBe("todos");
	});

	test("words ending in y → ies", () => {
		expect(pluralize("category")).toBe("categories");
	});

	test("leaves words already ending in s", () => {
		expect(pluralize("todos")).toBe("todos");
	});
});

describe("toKebabCase (openapi)", () => {
	test("converts camelCase", () => {
		expect(toKebabCase("addPackage")).toBe("add-package");
	});

	test("converts PascalCase", () => {
		expect(toKebabCase("AddPackage")).toBe("add-package");
	});

	test("handles single lowercase word", () => {
		expect(toKebabCase("todo")).toBe("todo");
	});
});
