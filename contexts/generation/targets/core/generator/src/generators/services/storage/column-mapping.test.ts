import type { ContextDef, DomainSchema, EntityDef } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import { entityToFieldSpecs, entityToIndexSpecs } from "./column-mapping";

const makeEntity = (attributes: EntityDef["attributes"]): EntityDef =>
	({
		description: "Test",
		attributes: attributes,
		relationships: [],
	}) as EntityDef;

const makeSchema = (
	entityName: string,
	entityDef: EntityDef,
	valueObjects?: Record<
		string,
		{
			attributes: Record<
				string,
				{
					description: string;
					optional?: boolean;
					type: { kind: string; name?: string };
				}
			>;
			description: string;
		}
	>,
): DomainSchema => ({
	name: "Test",
	contexts: {
		main: {
			description: "Test context",
			entities: {
				[entityName]: entityDef,
			},
			...(valueObjects ? { valueObjects: valueObjects as never } : {}),
			commands: {},
			queries: {},
			dependencies: [],
			invariants: [],
		} as ContextDef,
	},
});

describe("entityToFieldSpecs", () => {
	test("maps primitives correctly", () => {
		const entity = makeEntity({
			name: {
				description: "Name",
				type: { kind: "primitive", name: "string" },
			},
			count: {
				description: "Count",
				type: { kind: "primitive", name: "float" },
			},
			active: {
				description: "Active",
				type: { kind: "primitive", name: "boolean" },
			},
		});
		const schema = makeSchema("Item", entity);
		const specs = entityToFieldSpecs({ name: "Item", def: entity }, schema);
		expect(specs).toEqual([
			{ name: "active", type: { kind: "boolean" }, nullable: false },
			{ name: "count", type: { kind: "float" }, nullable: false },
			{ name: "name", type: { kind: "string" }, nullable: false },
		]);
	});

	test("skips id attribute", () => {
		const entity = makeEntity({
			id: { description: "ID", type: { kind: "primitive", name: "string" } },
			name: {
				description: "Name",
				type: { kind: "primitive", name: "string" },
			},
		});
		const schema = makeSchema("Item", entity);
		const specs = entityToFieldSpecs({ name: "Item", def: entity }, schema);
		expect(specs.map((s) => s.name)).toEqual(["name"]);
	});

	test("maps entityId to id kind", () => {
		const entity = makeEntity({
			userId: {
				description: "User",
				type: { kind: "entityId", entity: "User" },
			},
		});
		const schema = makeSchema("Todo", entity);
		const specs = entityToFieldSpecs({ name: "Todo", def: entity }, schema);
		expect(specs[0]!.type).toEqual({ kind: "id" });
	});

	test("maps string literal union", () => {
		const entity = makeEntity({
			priority: {
				description: "Priority",
				type: { kind: "union", values: ["low", "medium", "high"] },
			},
		});
		const schema = makeSchema("Todo", entity);
		const specs = entityToFieldSpecs({ name: "Todo", def: entity }, schema);
		expect(specs[0]!.type).toEqual({
			kind: "union",
			values: ["low", "medium", "high"],
		});
	});

	test("maps optional attribute", () => {
		const entity = makeEntity({
			note: {
				description: "Note",
				type: { kind: "primitive", name: "string" },
				optional: true,
			},
		});
		const schema = makeSchema("Todo", entity);
		const specs = entityToFieldSpecs({ name: "Todo", def: entity }, schema);
		expect(specs[0]!.nullable).toBe(true);
	});

	test("maps value object to object kind", () => {
		const entity = makeEntity({
			dueDate: {
				description: "Due",
				type: { kind: "valueObject", name: "DueDate" },
			},
		});
		const schema = makeSchema("Todo", entity, {
			DueDate: {
				description: "Due date",
				attributes: {
					date: {
						description: "date",
						type: { kind: "primitive", name: "string" },
					},
					timezone: {
						description: "tz",
						type: { kind: "primitive", name: "string" },
					},
				},
			},
		});
		const specs = entityToFieldSpecs({ name: "Todo", def: entity }, schema);
		expect(specs[0]!.type).toEqual({
			kind: "object",
			fields: [
				{ name: "date", type: { kind: "string" }, nullable: false },
				{ name: "timezone", type: { kind: "string" }, nullable: false },
			],
		});
	});

	test("maps array to array kind with child table", () => {
		const entity = makeEntity({
			tags: {
				description: "Tags",
				type: {
					kind: "array",
					element: { kind: "primitive", name: "string" },
				},
			},
		});
		const schema = makeSchema("Todo", entity);
		const specs = entityToFieldSpecs({ name: "Todo", def: entity }, schema);
		expect(specs[0]!.type).toEqual({
			kind: "array",
			element: { kind: "string" },
			childTable: "todo_tags",
		});
	});
});

describe("entityToIndexSpecs", () => {
	test("extracts unique attributes", () => {
		const entity = makeEntity({
			email: {
				description: "Email",
				type: { kind: "primitive", name: "string" },
				constraints: [{ kind: "unique" }],
			},
		});
		const specs = entityToIndexSpecs({ name: "User", def: entity });
		expect(specs).toEqual([{ kind: "unique", field: "email" }]);
	});

	test("extracts foreign key attributes", () => {
		const entity = makeEntity({
			userId: {
				description: "User",
				type: { kind: "entityId", entity: "User" },
			},
		});
		const specs = entityToIndexSpecs({ name: "Todo", def: entity });
		expect(specs).toEqual([{ kind: "nonUnique", field: "userId" }]);
	});
});
