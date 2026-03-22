import { describe, expect, test } from "bun:test";

import type { DomainSchema } from "@morph/domain-schema";

import { generateArbitraries } from "./arbitraries";

const makeSchema = (contexts: DomainSchema["contexts"]): DomainSchema => ({
	name: "Test",
	contexts,
});

const withEntity = makeSchema({
	main: {
		description: "test",
		entities: {
			Todo: {
				description: "A todo",
				attributes: {
					title: {
						type: { kind: "primitive", name: "string" },
						description: "Title",
					},
				},
				relationships: [],
			},
		},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

const withValueObject = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
		valueObjects: {
			Address: {
				description: "An address",
				attributes: {
					street: {
						type: { kind: "primitive", name: "string" },
						description: "Street",
					},
				},
			},
		},
	},
});

const emptySchema = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

describe("generateArbitraries", () => {
	test("returns empty string when no entities or value objects", () => {
		expect(generateArbitraries(emptySchema)).toBe("");
	});

	test("generates entity arbitraries", () => {
		const output = generateArbitraries(withEntity);
		expect(output).toContain("TodoIdArbitrary");
		expect(output).toContain("TodoArbitrary");
		expect(output).toContain("Arbitrary.make(TodoSchema)");
		expect(output).toContain("Arbitrary.make(TodoIdSchema)");
	});

	test("generates value object arbitraries", () => {
		const output = generateArbitraries(withValueObject);
		expect(output).toContain("AddressArbitrary");
		expect(output).toContain("Arbitrary.make(AddressSchema)");
	});

	test("imports from effect/Arbitrary", () => {
		const output = generateArbitraries(withEntity);
		expect(output).toContain('import * as Arbitrary from "effect/Arbitrary"');
	});

	test("imports schemas from default path", () => {
		const output = generateArbitraries(withEntity);
		expect(output).toContain('from "./schemas"');
	});

	test("uses custom schemas import path", () => {
		const output = generateArbitraries(withEntity, {
			schemasImportPath: "../dsl/schemas",
		});
		expect(output).toContain('from "../dsl/schemas"');
	});

	test("imports both entity schemas and ID schemas", () => {
		const output = generateArbitraries(withEntity);
		expect(output).toContain("TodoSchema");
		expect(output).toContain("TodoIdSchema");
	});
});
