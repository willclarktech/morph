import { describe, expect, test } from "bun:test";

import type { DomainSchema } from "@morph/domain-schema";

import { generatePorts } from "./ports";

const makeSchema = (contexts: DomainSchema["contexts"]): DomainSchema => ({
	name: "Test",
	contexts,
});

const withPort = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
		ports: {
			Storage: {
				description: "Key-value storage",
				methods: {
					get: {
						description: "Get a value",
						params: {
							key: {
								type: { kind: "primitive", name: "string" },
								description: "Key",
							},
						},
						returns: { kind: "primitive", name: "string" },
						errors: ["NotFound"],
					},
					put: {
						description: "Store a value",
						params: {
							key: {
								type: { kind: "primitive", name: "string" },
								description: "Key",
							},
							value: {
								type: { kind: "primitive", name: "string" },
								description: "Value",
							},
						},
						returns: { kind: "primitive", name: "void" },
						errors: [],
					},
				},
			},
		},
	},
});

const withGenericPort = makeSchema({
	main: {
		description: "test",
		entities: {},
		commands: {},
		queries: {},
		invariants: [],
		dependencies: [],
		ports: {
			Container: {
				description: "Generic container",
				typeParameters: [
					{ name: "T" },
					{
						name: "E",
						constraint: { kind: "primitive", name: "string" },
					},
				],
				methods: {
					get: {
						description: "Get value",
						params: {},
						returns: { kind: "primitive", name: "string" },
						errors: [],
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

describe("generatePorts", () => {
	test("returns empty string when no ports defined", () => {
		const output = generatePorts(emptySchema, { packageScope: "test" });
		expect(output).toBe("");
	});

	test("generates port interface with methods", () => {
		const output = generatePorts(withPort, { packageScope: "test" });
		expect(output).toContain("export interface Storage");
		expect(output).toContain("readonly get:");
		expect(output).toContain("readonly put:");
	});

	test("generates Effect return types for methods", () => {
		const output = generatePorts(withPort, { packageScope: "test" });
		expect(output).toContain("Effect.Effect<string, NotFoundError>");
		expect(output).toContain("Effect.Effect<void, never>");
	});

	test("generates Context.GenericTag with package scope", () => {
		const output = generatePorts(withPort, { packageScope: "myapp" });
		expect(output).toContain('Context.GenericTag<Storage>("@myapp/Storage")');
	});

	test("imports error types when methods have errors", () => {
		const output = generatePorts(withPort, { packageScope: "test" });
		expect(output).toContain("NotFoundError");
		expect(output).toContain('from "./errors"');
	});

	test("uses custom errors import path", () => {
		const output = generatePorts(withPort, {
			packageScope: "test",
			errorsImportPath: "../dsl/errors",
		});
		expect(output).toContain('from "../dsl/errors"');
	});

	test("generates type parameters for generic ports", () => {
		const output = generatePorts(withGenericPort, {
			packageScope: "test",
		});
		expect(output).toContain("interface Container<T, E extends string>");
	});

	test("imports Effect and Context from effect", () => {
		const output = generatePorts(withPort, { packageScope: "test" });
		expect(output).toContain('import type { Effect } from "effect"');
		expect(output).toContain('import { Context } from "effect"');
	});

	test("generates for specific context when contextName is provided", () => {
		const output = generatePorts(withPort, {
			packageScope: "test",
			contextName: "main",
		});
		expect(output).toContain("interface Storage");
	});

	test("method parameters include types", () => {
		const output = generatePorts(withPort, { packageScope: "test" });
		expect(output).toContain("key: string");
		expect(output).toContain("value: string");
	});
});
