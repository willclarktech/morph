import type { DomainSchema } from "@morphdsl/domain-schema";

import { describe, expect, test } from "bun:test";

import { generate } from "./generate";

const minimalSchema: DomainSchema = {
	name: "TestApp",
	contexts: {
		test: {
			description: "Test context",
			dependencies: [],
			invariants: [],
			entities: {
				Todo: {
					description: "A todo item",
					attributes: {
						title: {
							description: "Title",
							type: { kind: "primitive", name: "string" },
						},
						completed: {
							description: "Done?",
							type: { kind: "primitive", name: "boolean" },
						},
					},
					relationships: [],
				},
			},
			commands: {
				createTodo: {
					description: "Create a todo",
					input: {
						title: {
							description: "Title",
							type: { kind: "primitive", name: "string" },
						},
					},
					output: { kind: "entity", name: "Todo" },
					tags: ["@api"],
					emits: [{ name: "TodoCreated", description: "A todo was created" }],
					errors: [
						{
							name: "Validation",
							description: "Invalid input",
							when: "title is empty",
						},
					],
					uses: [{ aggregate: "Todo", access: "write" as const }],
				},
			},
			queries: {
				listTodos: {
					description: "List todos",
					input: {},
					output: { kind: "array", element: { kind: "entity", name: "Todo" } },
					tags: ["@api"],
					errors: [],
					uses: [{ aggregate: "Todo", access: "read" as const }],
				},
			},
		},
	},
};

describe("generate", () => {
	test("produces valid OpenAPI 3.0 structure", () => {
		const result = generate(minimalSchema);

		expect(result.files).toHaveLength(1);
		expect(result.files[0]!.filename).toBe("openapi.json");

		const document = JSON.parse(result.files[0]!.content);

		expect(document.openapi).toBe("3.0.3");
		expect(document.info.title).toBe("TestApp API");
		expect(document.info.version).toBe("1.0.0");
		expect(document.components).toBeDefined();
		expect(document.paths).toBeDefined();
	});

	test("includes entity schemas in components", () => {
		const result = generate(minimalSchema);
		const document = JSON.parse(result.files[0]!.content);

		expect(document.components.schemas.Todo).toBeDefined();
		expect(document.components.schemas.Todo.type).toBe("object");
		expect(document.components.schemas.Todo.properties.id).toBeDefined();
		expect(document.components.schemas.Todo.properties.title).toBeDefined();
	});

	test("generates operation paths", () => {
		const result = generate(minimalSchema);
		const document = JSON.parse(result.files[0]!.content);

		const paths = Object.keys(document.paths);
		expect(paths.length).toBeGreaterThan(0);
	});

	test("uses custom API version", () => {
		const result = generate(minimalSchema, { apiVersion: "2.0.0" });
		const document = JSON.parse(result.files[0]!.content);

		expect(document.info.version).toBe("2.0.0");
	});

	test("supports yaml output format", () => {
		const result = generate(minimalSchema, { format: "yaml" });

		expect(result.files[0]!.filename).toBe("openapi.yaml");
		expect(result.files[0]!.content).toContain("openapi: 3.0.3");
	});

	test("applies base path prefix", () => {
		const result = generate(minimalSchema, { basePath: "/api/v1" });
		const document = JSON.parse(result.files[0]!.content);

		const paths = Object.keys(document.paths);
		expect(paths.every((p) => p.startsWith("/api/v1"))).toBe(true);
	});

	test("includes error schemas from operations", () => {
		const result = generate(minimalSchema);
		const document = JSON.parse(result.files[0]!.content);

		expect(document.components.schemas.ValidationError).toBeDefined();
		expect(
			document.components.schemas.ValidationError.properties._tag,
		).toBeDefined();
		expect(
			document.components.schemas.ValidationError.properties._tag.enum,
		).toContain("ValidationError");
	});

	test("includes value object schemas", () => {
		const schemaWithVOs: DomainSchema = {
			...minimalSchema,
			contexts: {
				test: {
					...minimalSchema.contexts["test"]!,
					valueObjects: {
						Address: {
							description: "A mailing address",
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
						},
					},
				},
			},
		};

		const result = generate(schemaWithVOs);
		const document = JSON.parse(result.files[0]!.content);

		expect(document.components.schemas.Address).toBeDefined();
		expect(document.components.schemas.Address.type).toBe("object");
	});

	test("omits security schemes when no auth required", () => {
		const result = generate(minimalSchema);
		const document = JSON.parse(result.files[0]!.content);

		expect(document.components.securitySchemes).toBeUndefined();
	});

	test("generates function paths as POST endpoints", () => {
		const schemaWithFns: DomainSchema = {
			...minimalSchema,
			contexts: {
				test: {
					...minimalSchema.contexts["test"]!,
					functions: {
						calculateTotal: {
							description: "Calculate order total",
							input: {
								items: {
									description: "Items",
									type: {
										kind: "array",
										element: { kind: "primitive", name: "string" },
									},
								},
							},
							output: { kind: "primitive", name: "integer" },
							tags: ["@api"],
							errors: [],
						},
					},
				},
			},
		};

		const result = generate(schemaWithFns);
		const document = JSON.parse(result.files[0]!.content);

		const functionPath = Object.keys(document.paths).find((p) =>
			p.includes("calculate-totals"),
		);
		expect(functionPath).toBeDefined();
		expect(document.paths[functionPath!].post).toBeDefined();
	});
});
