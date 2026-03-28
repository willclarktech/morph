import type { TypeRef } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { typeRefToSchema } from "./schema-reference";

describe("typeRefToSchema", () => {
	test("primitive string", () => {
		const ref: TypeRef = { kind: "primitive", name: "string" };
		expect(typeRefToSchema(ref)).toBe("S.String");
	});

	test("primitive float", () => {
		const ref: TypeRef = { kind: "primitive", name: "float" };
		expect(typeRefToSchema(ref)).toBe("S.Number");
	});

	test("primitive boolean", () => {
		const ref: TypeRef = { kind: "primitive", name: "boolean" };
		expect(typeRefToSchema(ref)).toBe("S.Boolean");
	});

	test("primitive void", () => {
		const ref: TypeRef = { kind: "primitive", name: "void" };
		expect(typeRefToSchema(ref)).toBe("S.Void");
	});

	test("primitive unknown", () => {
		const ref: TypeRef = { kind: "primitive", name: "unknown" };
		expect(typeRefToSchema(ref)).toBe("S.Unknown");
	});

	test("entity reference", () => {
		const ref: TypeRef = { kind: "entity", name: "User" };
		expect(typeRefToSchema(ref)).toBe("UserSchema");
	});

	test("entityId reference", () => {
		const ref: TypeRef = { kind: "entityId", entity: "User" };
		expect(typeRefToSchema(ref)).toBe("UserIdSchema");
	});

	test("array of primitives", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "string" },
		};
		expect(typeRefToSchema(ref)).toBe("S.Array(S.String)");
	});

	test("optional type", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "string" },
		};
		expect(typeRefToSchema(ref)).toBe("S.optional(S.String)");
	});

	test("union of literals", () => {
		const ref: TypeRef = {
			kind: "union",
			values: ["active", "inactive"],
		};
		expect(typeRefToSchema(ref)).toBe(
			'S.Union(S.Literal("active"), S.Literal("inactive"))',
		);
	});

	test("type reference", () => {
		const ref: TypeRef = { kind: "type", name: "CustomType" };
		expect(typeRefToSchema(ref)).toBe("CustomTypeSchema");
	});

	test("valueObject reference", () => {
		const ref: TypeRef = { kind: "valueObject", name: "Money" };
		expect(typeRefToSchema(ref)).toBe("MoneySchema");
	});

	test("generic with args", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "List",
			args: [{ kind: "primitive", name: "string" }],
		};
		expect(typeRefToSchema(ref)).toBe("ListSchema(S.String)");
	});

	test("typeParam without context", () => {
		const ref: TypeRef = { kind: "typeParam", name: "T" };
		expect(typeRefToSchema(ref)).toBe("T");
	});

	test("typeParam with context mapping", () => {
		const ref: TypeRef = { kind: "typeParam", name: "T" };
		expect(typeRefToSchema(ref, { typeParams: { T: "tSchema" } })).toBe(
			"tSchema",
		);
	});

	test("function type returns S.Unknown", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [{ name: "x", type: { kind: "primitive", name: "float" } }],
			returns: { kind: "primitive", name: "string" },
		};
		expect(typeRefToSchema(ref)).toBe("S.Unknown");
	});

	test("nested: array of entity schemas", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "entity", name: "Todo" },
		};
		expect(typeRefToSchema(ref)).toBe("S.Array(TodoSchema)");
	});

	test("nested: optional array", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: {
				kind: "array",
				element: { kind: "primitive", name: "float" },
			},
		};
		expect(typeRefToSchema(ref)).toBe("S.optional(S.Array(S.Number))");
	});
});
