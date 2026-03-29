import type { DomainSchema } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { generateErrors } from "./errors";

const makeSchema = (contexts: DomainSchema["contexts"]): DomainSchema => ({
	name: "Test",
	contexts,
});

const withInlineErrors = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {
			doSomething: {
				description: "Do something",
				input: {},
				output: { kind: "primitive", name: "boolean" },
				emits: [],
				errors: [
					{
						name: "NotFound",
						description: "Item not found",
						when: "item does not exist",
					},
					{
						name: "Forbidden",
						description: "Access denied",
						when: "user lacks permission",
					},
				],
				tags: [],
				uses: [],
			},
		},
		queries: {},
		invariants: [],
		dependencies: [],
	},
});

const withContextErrors = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
		errors: {
			Validation: {
				description: "Validation failed",
				fields: {
					field: {
						type: { kind: "primitive", name: "string" },
						description: "The invalid field",
					},
					message: {
						type: { kind: "primitive", name: "string" },
						description: "Error message",
					},
				},
			},
		},
	},
});

const withBothErrorTypes = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {
			create: {
				description: "Create",
				input: {},
				output: { kind: "primitive", name: "boolean" },
				emits: [],
				errors: [
					{
						name: "Duplicate",
						description: "Already exists",
						when: "item exists",
					},
				],
				tags: [],
				uses: [],
			},
		},
		queries: {},
		invariants: [],
		dependencies: [],
		errors: {
			Auth: {
				description: "Authentication failed",
				fields: {
					reason: {
						type: { kind: "primitive", name: "string" },
						description: "Failure reason",
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

describe("generateErrors", () => {
	test("returns empty string when no errors defined", () => {
		expect(generateErrors(emptySchema)).toBe("");
	});

	test("generates inline error classes with message field", () => {
		const output = generateErrors(withInlineErrors);
		expect(output).toContain("class NotFoundError");
		expect(output).toContain("class ForbiddenError");
		expect(output).toContain('TaggedError("NotFoundError")');
		expect(output).toContain("readonly message: string");
	});

	test("generates union type of all errors", () => {
		const output = generateErrors(withInlineErrors);
		expect(output).toContain("export type DomainError =");
		expect(output).toContain("ForbiddenError");
		expect(output).toContain("NotFoundError");
	});

	test("generates context-level error classes with typed fields", () => {
		const output = generateErrors(withContextErrors);
		expect(output).toContain("class ValidationError");
		expect(output).toContain("readonly field: string");
		expect(output).toContain("readonly message: string");
	});

	test("includes both inline and context errors in union", () => {
		const output = generateErrors(withBothErrorTypes);
		expect(output).toContain("AuthError");
		expect(output).toContain("DuplicateError");
	});

	test("deduplicates errors with same name", () => {
		const schema = makeSchema({
			main: {
				description: "test",
				entities: {},
				commands: {
					op1: {
						description: "Op1",
						input: {},
						output: { kind: "primitive", name: "boolean" },
						emits: [],
						errors: [
							{ name: "Shared", description: "Shared error", when: "x" },
						],
						tags: [],
						uses: [],
					},
					op2: {
						description: "Op2",
						input: {},
						output: { kind: "primitive", name: "boolean" },
						emits: [],
						errors: [
							{ name: "Shared", description: "Shared error", when: "x" },
						],
						tags: [],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		const output = generateErrors(schema);
		const classCount = (output.match(/class SharedError/g) ?? []).length;
		expect(classCount).toBe(1);
	});

	test("uses context-prefixed union name when contextName is specified", () => {
		const output = generateErrors(withInlineErrors, {
			contextName: "main",
		});
		expect(output).toContain("export type MainError =");
		expect(output).not.toContain("DomainError");
	});

	test("handles kebab-case context names in union type", () => {
		const schema = makeSchema({
			"my-context": {
				description: "test",
				entities: {},
				commands: {
					doIt: {
						description: "Do it",
						input: {},
						output: { kind: "primitive", name: "boolean" },
						emits: [],
						errors: [{ name: "Oops", description: "Oops", when: "always" }],
						tags: [],
						uses: [],
					},
				},
				queries: {},
				invariants: [],
				dependencies: [],
			},
		});
		const output = generateErrors(schema, { contextName: "my-context" });
		expect(output).toContain("export type MyContextError =");
	});

	test("imports Data from effect", () => {
		const output = generateErrors(withInlineErrors);
		expect(output).toContain('import { Data } from "effect"');
	});
});
