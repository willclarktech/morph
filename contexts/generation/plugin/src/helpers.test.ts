import type { DomainSchema } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { schemaHasTag } from "./helpers";

const makeSchema = (contexts: DomainSchema["contexts"] = {}): DomainSchema => ({
	name: "test",
	contexts,
});

describe("schemaHasTag", () => {
	test("returns false for empty schema", () => {
		expect(schemaHasTag(makeSchema(), "api")).toBe(false);
	});

	test("returns true when command has matching tag", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {},
				commands: {
					doStuff: {
						description: "do",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [{ name: "StuffDone", description: "done" }],
						errors: [],
						tags: ["api"],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		expect(schemaHasTag(schema, "api")).toBe(true);
	});

	test("returns false when no operations have matching tag", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {},
				commands: {
					doStuff: {
						description: "do",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [{ name: "StuffDone", description: "done" }],
						errors: [],
						tags: ["cli"],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		expect(schemaHasTag(schema, "api")).toBe(false);
	});

	test("returns true when query has matching tag", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {},
				commands: {},
				queries: {
					getStuff: {
						description: "get",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: ["api"],
						uses: [],
					},
				},
				invariants: [],
				dependencies: [],
			},
		});
		expect(schemaHasTag(schema, "api")).toBe(true);
	});

	test("checks across multiple contexts", () => {
		const schema = makeSchema({
			first: {
				description: "first",
				entities: {},
				commands: {
					doA: {
						description: "a",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [{ name: "ADone", description: "done" }],
						errors: [],
						tags: ["cli"],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
			second: {
				description: "second",
				entities: {},
				commands: {
					doB: {
						description: "b",
						input: {},
						output: { kind: "primitive", name: "void" },
						emits: [{ name: "BDone", description: "done" }],
						errors: [],
						tags: ["api"],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		expect(schemaHasTag(schema, "api")).toBe(true);
		expect(schemaHasTag(schema, "cli")).toBe(true);
		expect(schemaHasTag(schema, "mcp")).toBe(false);
	});

	test("returns true when function has matching tag", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {},
				commands: {},
				queries: {},
				functions: {
					helper: {
						description: "help",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: ["api"],
					},
				},
				invariants: [],
				dependencies: [],
			},
		});
		expect(schemaHasTag(schema, "api")).toBe(true);
	});
});
