import type { TypeRef } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { typeRefToOpenApiSchema } from "./type-to-schema";

describe("typeRefToOpenApiSchema", () => {
	test("primitive string", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "primitive", name: "string" }),
		).toEqual({
			type: "string",
		});
	});

	test("primitive float", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "primitive", name: "float" }),
		).toEqual({
			type: "number",
		});
	});

	test("primitive boolean", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "primitive", name: "boolean" }),
		).toEqual({
			type: "boolean",
		});
	});

	test("entity creates $ref", () => {
		expect(typeRefToOpenApiSchema({ kind: "entity", name: "User" })).toEqual({
			$ref: "#/components/schemas/User",
		});
	});

	test("entityId maps to string", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "entityId", entity: "User" }),
		).toEqual({
			type: "string",
		});
	});

	test("array wraps element", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "string" },
		};
		expect(typeRefToOpenApiSchema(ref)).toEqual({
			items: { type: "string" },
			type: "array",
		});
	});

	test("optional adds nullable", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "string" },
		};
		expect(typeRefToOpenApiSchema(ref)).toEqual({
			type: "string",
			nullable: true,
		});
	});

	test("union creates enum", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "union", values: ["a", "b"] }),
		).toEqual({
			enum: ["a", "b"],
			type: "string",
		});
	});

	test("type creates $ref", () => {
		expect(typeRefToOpenApiSchema({ kind: "type", name: "Config" })).toEqual({
			$ref: "#/components/schemas/Config",
		});
	});

	test("valueObject creates $ref", () => {
		expect(
			typeRefToOpenApiSchema({ kind: "valueObject", name: "Money" }),
		).toEqual({
			$ref: "#/components/schemas/Money",
		});
	});

	test("generic creates $ref to base type", () => {
		const ref: TypeRef = {
			kind: "generic",
			name: "List",
			args: [{ kind: "primitive", name: "string" }],
		};
		expect(typeRefToOpenApiSchema(ref)).toEqual({
			$ref: "#/components/schemas/List",
		});
	});

	test("typeParam maps to object", () => {
		expect(typeRefToOpenApiSchema({ kind: "typeParam", name: "T" })).toEqual({
			type: "object",
		});
	});

	test("function maps to object", () => {
		const ref: TypeRef = {
			kind: "function",
			params: [{ name: "x", type: { kind: "primitive", name: "float" } }],
			returns: { kind: "primitive", name: "string" },
		};
		expect(typeRefToOpenApiSchema(ref)).toEqual({ type: "object" });
	});
});
