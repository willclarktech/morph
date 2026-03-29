import type { TypeRef } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { typeRefToSchema } from "./type-to-schema";

describe("typeRefToSchema (core)", () => {
	test("primitive string → S.String", () => {
		expect(typeRefToSchema({ kind: "primitive", name: "string" })).toBe(
			"S.String",
		);
	});

	test("primitive float → S.Number", () => {
		expect(typeRefToSchema({ kind: "primitive", name: "float" })).toBe(
			"S.Number",
		);
	});

	test("primitive boolean → S.Boolean", () => {
		expect(typeRefToSchema({ kind: "primitive", name: "boolean" })).toBe(
			"S.Boolean",
		);
	});

	test("primitive void → S.Void", () => {
		expect(typeRefToSchema({ kind: "primitive", name: "void" })).toBe("S.Void");
	});

	test("primitive unknown → S.Unknown", () => {
		expect(typeRefToSchema({ kind: "primitive", name: "unknown" })).toBe(
			"S.Unknown",
		);
	});

	test("entity → NameSchema", () => {
		expect(typeRefToSchema({ kind: "entity", name: "User" })).toBe(
			"UserSchema",
		);
	});

	test("entityId → EntityIdSchema", () => {
		expect(typeRefToSchema({ kind: "entityId", entity: "Todo" })).toBe(
			"TodoIdSchema",
		);
	});

	test("array → S.Array(element)", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "string" },
		};
		expect(typeRefToSchema(ref)).toBe("S.Array(S.String)");
	});

	test("optional → S.optional(inner)", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "float" },
		};
		expect(typeRefToSchema(ref)).toBe("S.optional(S.Number)");
	});

	test("union → S.Union of literals", () => {
		const ref: TypeRef = {
			kind: "union",
			values: ["open", "closed"],
		};
		expect(typeRefToSchema(ref)).toBe(
			'S.Union(S.Literal("open"), S.Literal("closed"))',
		);
	});

	test("type → NameSchema", () => {
		expect(typeRefToSchema({ kind: "type", name: "Config" })).toBe(
			"ConfigSchema",
		);
	});

	test("valueObject → NameSchema", () => {
		expect(typeRefToSchema({ kind: "valueObject", name: "Address" })).toBe(
			"AddressSchema",
		);
	});

	test("generic includes comment", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "List",
			args: [{ kind: "primitive", name: "string" }],
		};
		const result = typeRefToSchema(ref);
		expect(result).toContain("ListSchema");
		expect(result).toContain("generic");
	});

	test("typeParam returns name directly", () => {
		expect(typeRefToSchema({ kind: "typeParam", name: "T" })).toBe("T");
	});

	test("function → S.Unknown", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [{ name: "x", type: { kind: "primitive", name: "string" } }],
			returns: { kind: "primitive", name: "void" },
		};
		expect(typeRefToSchema(ref)).toBe("S.Unknown");
	});
});
