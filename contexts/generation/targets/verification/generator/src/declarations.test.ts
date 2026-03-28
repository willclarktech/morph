import type { EntityDef, TypeRef } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import {
	declareCollectionBound,
	declareEntityFields,
	renderCollectorDeclarations,
	typeRefToSmtSort,
} from "./declarations";
import { createSmtCollector } from "./smt-compiler";

describe("typeRefToSmtSort", () => {
	test("integer → Int", () => {
		const ref: TypeRef = { kind: "primitive", name: "integer" };
		expect(typeRefToSmtSort(ref)).toBe("Int");
	});

	test("float → Real", () => {
		const ref: TypeRef = { kind: "primitive", name: "float" };
		expect(typeRefToSmtSort(ref)).toBe("Real");
	});

	test("boolean → Bool", () => {
		const ref: TypeRef = { kind: "primitive", name: "boolean" };
		expect(typeRefToSmtSort(ref)).toBe("Bool");
	});

	test("string → StringId", () => {
		const ref: TypeRef = { kind: "primitive", name: "string" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});

	test("date → StringId", () => {
		const ref: TypeRef = { kind: "primitive", name: "date" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});

	test("datetime → StringId", () => {
		const ref: TypeRef = { kind: "primitive", name: "datetime" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});

	test("entityId → StringId", () => {
		const ref: TypeRef = { kind: "entityId", entity: "User" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});

	test("union → Int", () => {
		const ref: TypeRef = { kind: "union", values: ["active", "inactive"] };
		expect(typeRefToSmtSort(ref)).toBe("Int");
	});

	test("optional unwraps inner type", () => {
		const ref: TypeRef = {
			kind: "optional",
			inner: { kind: "primitive", name: "integer" },
		};
		expect(typeRefToSmtSort(ref)).toBe("Int");
	});

	test("array uses element sort", () => {
		const ref: TypeRef = {
			kind: "array",
			element: { kind: "primitive", name: "boolean" },
		};
		expect(typeRefToSmtSort(ref)).toBe("Bool");
	});

	test("entity → StringId", () => {
		const ref: TypeRef = { kind: "entity", name: "User" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});

	test("valueObject → StringId", () => {
		const ref: TypeRef = { kind: "valueObject", name: "Address" };
		expect(typeRefToSmtSort(ref)).toBe("StringId");
	});
});

describe("declareEntityFields", () => {
	test("declares simple attributes", () => {
		const entity: EntityDef = {
			description: "Test entity",
			relationships: [],
			attributes: {
				title: {
					type: { kind: "primitive", name: "string" },
					description: "Title",
				},
				priority: {
					type: { kind: "primitive", name: "integer" },
					description: "Priority",
				},
				done: {
					type: { kind: "primitive", name: "boolean" },
					description: "Done flag",
				},
			},
		};

		const result = declareEntityFields("Todo", entity, "todo");
		expect(result).toContain("(declare-const todo_title StringId)");
		expect(result).toContain("(declare-const todo_priority Int)");
		expect(result).toContain("(declare-const todo_done Bool)");
	});

	test("declares array attributes with bounded collection", () => {
		const entity: EntityDef = {
			description: "Test entity",
			relationships: [],
			attributes: {
				tags: {
					type: {
						kind: "array",
						element: { kind: "primitive", name: "string" },
					},
					description: "Tags",
				},
			},
		};

		const result = declareEntityFields("Todo", entity, "todo");
		expect(result).toContain("(declare-const todo_tags_len Int)");
		expect(result).toContain("(declare-const todo_tags_0 StringId)");
		expect(result).toContain("(declare-const todo_tags_4 StringId)");
		expect(result).toContain(
			"(assert (and (>= todo_tags_len 0) (<= todo_tags_len 5)))",
		);
	});

	test("declares optional attributes with _defined flag", () => {
		const entity: EntityDef = {
			description: "Test entity",
			relationships: [],
			attributes: {
				dueDate: {
					type: {
						kind: "optional",
						inner: { kind: "primitive", name: "datetime" },
					},
					description: "Due date",
				},
			},
		};

		const result = declareEntityFields("Todo", entity, "todo");
		expect(result).toContain("(declare-const todo_dueDate StringId)");
		expect(result).toContain("(declare-const todo_dueDate_defined Bool)");
	});

	test("declares union attributes with range constraint", () => {
		const entity: EntityDef = {
			description: "Test entity",
			relationships: [],
			attributes: {
				status: {
					type: {
						kind: "union",
						values: ["active", "completed", "archived"],
					},
					description: "Status",
				},
			},
		};

		const result = declareEntityFields("Todo", entity, "todo");
		expect(result).toContain("(declare-const todo_status Int)");
		expect(result).toContain(
			"(assert (and (>= todo_status 0) (< todo_status 3)))",
		);
	});
});

describe("declareCollectionBound", () => {
	test("creates length and element constants", () => {
		const lines = declareCollectionBound("items", "Int", 3);
		expect(lines).toContain("(declare-const items_len Int)");
		expect(lines).toContain("(assert (and (>= items_len 0) (<= items_len 3)))");
		expect(lines).toContain("(declare-const items_0 Int)");
		expect(lines).toContain("(declare-const items_1 Int)");
		expect(lines).toContain("(declare-const items_2 Int)");
		expect(lines).toHaveLength(5);
	});
});

describe("renderCollectorDeclarations", () => {
	test("renders context, input, literal, and collection bound declarations", () => {
		const collector = createSmtCollector();
		collector.contextIds.set("ctx_currentUser_id", "StringId");
		collector.inputIds.set("input_userId", "StringId");
		collector.literalIds.set("|str_admin|", "StringId");
		collector.collectionBounds.set("ctx_users", 5);
		const result = renderCollectorDeclarations(collector);
		expect(result).toContain("(declare-const ctx_currentUser_id StringId)");
		expect(result).toContain("(declare-const input_userId StringId)");
		expect(result).toContain("(declare-const |str_admin| StringId)");
		expect(result).toContain(
			"(assert (and (>= ctx_users_len 0) (<= ctx_users_len 5)))",
		);
	});

	test("returns empty string for empty collector", () => {
		const collector = createSmtCollector();
		expect(renderCollectorDeclarations(collector)).toBe("");
	});
});
