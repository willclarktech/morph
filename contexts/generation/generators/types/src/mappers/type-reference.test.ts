import type { TypeRef } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { typeRefToTypeScript } from "./type-reference";

describe("typeRefToTypeScript", () => {
	test("primitive string", () => {
		const ref: TypeRef = { kind: "primitive", name: "string" };
		expect(typeRefToTypeScript(ref)).toBe("string");
	});

	test("primitive float", () => {
		const ref: TypeRef = { kind: "primitive", name: "float" };
		expect(typeRefToTypeScript(ref)).toBe("number");
	});

	test("primitive boolean", () => {
		const ref: TypeRef = { kind: "primitive", name: "boolean" };
		expect(typeRefToTypeScript(ref)).toBe("boolean");
	});

	test("primitive void", () => {
		const ref: TypeRef = { kind: "primitive", name: "void" };
		expect(typeRefToTypeScript(ref)).toBe("void");
	});

	test("primitive unknown", () => {
		const ref: TypeRef = { kind: "primitive", name: "unknown" };
		expect(typeRefToTypeScript(ref)).toBe("unknown");
	});

	test("entity reference", () => {
		const ref: TypeRef = { kind: "entity", name: "User" };
		expect(typeRefToTypeScript(ref)).toBe("User");
	});

	test("entityId reference", () => {
		const ref: TypeRef = { kind: "entityId", entity: "User" };
		expect(typeRefToTypeScript(ref)).toBe("UserId");
	});

	test("array of primitives", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "string" },
		};
		expect(typeRefToTypeScript(ref)).toBe("readonly string[]");
	});

	test("array of entities", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "entity", name: "Todo" },
		};
		expect(typeRefToTypeScript(ref)).toBe("readonly Todo[]");
	});

	test("optional primitive", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "string" },
		};
		expect(typeRefToTypeScript(ref)).toBe("string | undefined");
	});

	test("union of string literals", () => {
		const ref: TypeRef = {
			kind: "union",
			values: ["active", "inactive", "deleted"],
		};
		expect(typeRefToTypeScript(ref)).toBe('"active" | "inactive" | "deleted"');
	});

	test("type reference", () => {
		const ref: TypeRef = { kind: "type", name: "CustomType" };
		expect(typeRefToTypeScript(ref)).toBe("CustomType");
	});

	test("typeParam reference", () => {
		const ref: TypeRef = { kind: "typeParam", name: "T" };
		expect(typeRefToTypeScript(ref)).toBe("T");
	});

	test("valueObject reference", () => {
		const ref: TypeRef = { kind: "valueObject", name: "Money" };
		expect(typeRefToTypeScript(ref)).toBe("Money");
	});

	test("generic with single arg", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "List",
			args: [{ kind: "primitive", name: "string" }],
		};
		expect(typeRefToTypeScript(ref)).toBe("List<string>");
	});

	test("generic with multiple args", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "Map",
			args: [
				{ kind: "primitive", name: "string" },
				{ kind: "primitive", name: "float" },
			],
		};
		expect(typeRefToTypeScript(ref)).toBe("Map<string, number>");
	});

	test("function type", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [{ name: "x", type: { kind: "primitive", name: "float" } }],
			returns: { kind: "primitive", name: "string" },
		};
		expect(typeRefToTypeScript(ref)).toBe("(x: number) => string");
	});

	test("function with multiple params", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [
				{ name: "a", type: { kind: "primitive", name: "string" } },
				{ name: "b", type: { kind: "primitive", name: "float" } },
			],
			returns: { kind: "primitive", name: "boolean" },
		};
		expect(typeRefToTypeScript(ref)).toBe("(a: string, b: number) => boolean");
	});

	test("nested: optional array of entities", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: {
				kind: "array",
				element: { kind: "entity", name: "Todo" },
			},
		};
		expect(typeRefToTypeScript(ref)).toBe("readonly Todo[] | undefined");
	});

	test("nested: array of optional strings", () => {
		const ref: TypeRef = {
			kind: "array",
			element: {
				kind: "optional",
				inner: { kind: "primitive", name: "string" },
			},
		};
		expect(typeRefToTypeScript(ref)).toBe("readonly string | undefined[]");
	});
});
