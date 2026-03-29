import type { TypeRef } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { toMermaidType } from "./mermaid";

describe("toMermaidType", () => {
	test("primitive string", () => {
		expect(toMermaidType({ kind: "primitive", name: "string" })).toBe("string");
	});

	test("primitive float", () => {
		expect(toMermaidType({ kind: "primitive", name: "float" })).toBe("float");
	});

	test("primitive boolean", () => {
		expect(toMermaidType({ kind: "primitive", name: "boolean" })).toBe(
			"boolean",
		);
	});

	test("entity reference uses name", () => {
		expect(toMermaidType({ kind: "entity", name: "User" })).toBe("User");
	});

	test("entityId maps to string", () => {
		expect(toMermaidType({ kind: "entityId", entity: "User" })).toBe("string");
	});

	test("array adds brackets", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "string" },
		};
		expect(toMermaidType(ref)).toBe("string[]");
	});

	test("optional unwraps inner type", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "float" },
		};
		expect(toMermaidType(ref)).toBe("float");
	});

	test("union maps to string", () => {
		expect(toMermaidType({ kind: "union", values: ["a", "b"] })).toBe("string");
	});

	test("type reference uses name", () => {
		expect(toMermaidType({ kind: "type", name: "Config" })).toBe("Config");
	});

	test("valueObject uses name", () => {
		expect(toMermaidType({ kind: "valueObject", name: "Address" })).toBe(
			"Address",
		);
	});

	test("generic shows args", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "List",
			args: [{ kind: "primitive", name: "string" }],
		};
		expect(toMermaidType(ref)).toBe("List<string>");
	});

	test("typeParam uses name", () => {
		expect(toMermaidType({ kind: "typeParam", name: "T" })).toBe("T");
	});

	test("function maps to Function", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [{ name: "x", type: { kind: "primitive", name: "float" } }],
			returns: { kind: "primitive", name: "string" },
		};
		expect(toMermaidType(ref)).toBe("Function");
	});
});
