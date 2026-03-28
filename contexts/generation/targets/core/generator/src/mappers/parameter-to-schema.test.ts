import type { ParamDef } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { parameterDefToSchema } from "./parameter-to-schema";

describe("parameterDefToSchema", () => {
	test("required string parameter", () => {
		const param: ParamDef = {
			description: "User name",
			type: { kind: "primitive", name: "string" },
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("S.String");
		expect(result).toContain('description: "User name"');
	});

	test("optional parameter wraps in S.optional", () => {
		const param: ParamDef = {
			description: "Note",
			type: { kind: "primitive", name: "string" },
			optional: true,
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("S.optional(S.String)");
	});

	test("sensitive parameter adds annotation", () => {
		const param: ParamDef = {
			description: "Password",
			type: { kind: "primitive", name: "string" },
			sensitive: true,
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("sensitive: true");
	});

	test("parameter with no description omits annotation", () => {
		const param = {
			type: { kind: "primitive", name: "float" },
		} as ParamDef;
		const result = parameterDefToSchema(param);
		expect(result).toBe("S.Number");
	});

	test("parameter with description adds annotation", () => {
		const param: ParamDef = {
			description: "A value",
			type: { kind: "primitive", name: "float" },
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain(".annotations({");
		expect(result).toContain('description: "A value"');
	});

	test("optional + sensitive + description", () => {
		const param: ParamDef = {
			description: "Secret key",
			type: { kind: "primitive", name: "string" },
			optional: true,
			sensitive: true,
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("S.optional(S.String)");
		expect(result).toContain('description: "Secret key"');
		expect(result).toContain("sensitive: true");
	});

	test("entity type parameter", () => {
		const param: ParamDef = {
			description: "Todo ID",
			type: { kind: "entityId", entity: "Todo" },
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("TodoIdSchema");
	});

	test("escapes quotes in description", () => {
		const param: ParamDef = {
			description: 'The "name" field',
			type: { kind: "primitive", name: "string" },
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain(String.raw`The \"name\" field`);
	});

	test("array parameter", () => {
		const param: ParamDef = {
			description: "Tags",
			type: {
				kind: "array",
				element: { kind: "primitive", name: "string" },
			},
		};
		const result = parameterDefToSchema(param);
		expect(result).toContain("S.Array(S.String)");
	});
});
