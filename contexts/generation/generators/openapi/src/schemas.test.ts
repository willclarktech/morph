import type { EntityDef, ValueObjectDef } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { entityToSchema, valueObjectToSchema } from "./schemas";

describe("entityToSchema", () => {
	test("includes id field as string", () => {
		const entity: EntityDef = {
			description: "A todo",
			attributes: {
				title: {
					description: "Title",
					type: { kind: "primitive", name: "string" },
				},
			},
			relationships: [],
		};
		const schema = entityToSchema("Todo", entity);
		expect(schema.type).toBe("object");
		expect(schema.properties!["id"]).toEqual({ type: "string" });
		expect(schema.required).toContain("id");
	});

	test("includes non-optional attributes as required", () => {
		const entity: EntityDef = {
			description: "A user",
			attributes: {
				name: {
					description: "Name",
					type: { kind: "primitive", name: "string" },
				},
			},
			relationships: [],
		};
		const schema = entityToSchema("User", entity);
		expect(schema.required).toContain("name");
	});

	test("excludes optional attributes from required", () => {
		const entity: EntityDef = {
			description: "A todo",
			attributes: {
				note: {
					description: "Note",
					type: { kind: "primitive", name: "string" },
					optional: true,
				},
			},
			relationships: [],
		};
		const schema = entityToSchema("Todo", entity);
		expect(schema.required).not.toContain("note");
	});

	test("maps attribute types to OpenAPI schemas", () => {
		const entity: EntityDef = {
			description: "Test",
			attributes: {
				count: {
					description: "Count",
					type: { kind: "primitive", name: "float" },
				},
			},
			relationships: [],
		};
		const schema = entityToSchema("Test", entity);
		expect(schema.properties!["count"]).toEqual({ type: "number" });
	});
});

describe("valueObjectToSchema", () => {
	test("maps all attributes", () => {
		const vo: ValueObjectDef = {
			description: "An address",
			attributes: {
				street: {
					description: "Street",
					type: { kind: "primitive", name: "string" },
				},
				city: {
					description: "City",
					type: { kind: "primitive", name: "string" },
				},
			},
		};
		const schema = valueObjectToSchema(vo);
		expect(schema.type).toBe("object");
		expect(schema.properties!["street"]).toEqual({ type: "string" });
		expect(schema.properties!["city"]).toEqual({ type: "string" });
		expect(schema.required).toContain("street");
		expect(schema.required).toContain("city");
	});

	test("does not include id field", () => {
		const vo: ValueObjectDef = {
			description: "Money",
			attributes: {
				amount: {
					description: "Amount",
					type: { kind: "primitive", name: "float" },
				},
			},
		};
		const schema = valueObjectToSchema(vo);
		expect(schema.properties!["id"]).toBeUndefined();
	});
});
