import { describe, expect, test } from "bun:test";

import { parseSchema } from "./schemas";

describe("DomainSchema with types and functions", () => {
	test("parses a transformation-domain schema with types", () => {
		const schema = {
			name: "test-generator",
			contexts: {
				generation: {
					description: "Code generation operations",
					types: {
						GeneratedFile: {
							kind: "product",
							description: "A generated file",
							fields: {
								filename: {
									description: "File path",
									type: { kind: "primitive", name: "string" },
								},
								content: {
									description: "File content",
									type: { kind: "primitive", name: "string" },
								},
							},
						},
						Result: {
							kind: "sum",
							description: "Success or failure",
							discriminator: "status",
							variants: {
								success: {
									description: "Success",
									fields: {
										value: {
											description: "Result value",
											type: { kind: "primitive", name: "string" },
										},
									},
								},
								error: {
									description: "Error",
									fields: {
										message: {
											description: "Error message",
											type: { kind: "primitive", name: "string" },
										},
									},
								},
							},
						},
						FileList: {
							kind: "alias",
							description: "List of files",
							type: {
								kind: "array",
								element: { kind: "type", name: "GeneratedFile" },
							},
						},
					},
					entities: {},
					contracts: [],
					invariants: [],
					dependencies: [],
				},
			},
		};

		const result = parseSchema(schema);
		expect(result.name).toBe("test-generator");

		const types = result.contexts["generation"]?.types;
		expect(types).toBeDefined();
		expect(types?.["GeneratedFile"]?.kind).toBe("product");
		expect(types?.["Result"]?.kind).toBe("sum");
		expect(types?.["FileList"]?.kind).toBe("alias");
	});

	test("parses a schema with functions", () => {
		const schema = {
			name: "test-functions",
			contexts: {
				compute: {
					description: "Computation functions",
					functions: {
						transform: {
							description: "Transform input data",
							input: {
								data: {
									description: "Input data",
									type: { kind: "primitive", name: "string" },
								},
							},
							output: { kind: "primitive", name: "string" },
							errors: [
								{
									name: "InvalidInput",
									description: "Input was invalid",
									when: "data is malformed",
								},
							],
							tags: ["@cli"],
						},
					},
					entities: {},
					contracts: [],
					invariants: [],
					dependencies: [],
				},
			},
		};

		const result = parseSchema(schema);
		expect(result.name).toBe("test-functions");

		const functions = result.contexts["compute"]?.functions;
		expect(functions).toBeDefined();
		expect(functions?.["transform"]?.description).toBe("Transform input data");
		expect(functions?.["transform"]?.tags).toEqual(["@cli"]);
	});

	test("parses TypeTypeReference in output", () => {
		const schema = {
			name: "test-type-ref",
			contexts: {
				gen: {
					description: "Test context",
					types: {
						Output: {
							kind: "product",
							description: "Output type",
							fields: {
								value: {
									description: "A value",
									type: { kind: "primitive", name: "string" },
								},
							},
						},
					},
					functions: {
						process: {
							description: "Process and return output",
							input: {},
							output: { kind: "type", name: "Output" },
							errors: [],
							tags: [],
						},
					},
					entities: {},
					contracts: [],
					invariants: [],
					dependencies: [],
				},
			},
		};

		const result = parseSchema(schema);
		const processOutput =
			result.contexts["gen"]?.functions?.["process"]?.output;
		expect(processOutput?.kind).toBe("type");
		if (processOutput?.kind === "type") {
			expect(processOutput.name).toBe("Output");
		}
	});

	test("hybrid schema with entities and types", () => {
		const schema = {
			name: "hybrid",
			contexts: {
				main: {
					description: "Hybrid context",
					entities: {
						User: {
							description: "A user entity",
							attributes: {
								name: {
									description: "User name",
									type: { kind: "primitive", name: "string" },
								},
							},
							relationships: [],
						},
					},
					types: {
						UserSummary: {
							kind: "product",
							description: "Summary of user data",
							fields: {
								count: {
									description: "Number of users",
									type: { kind: "primitive", name: "float" },
								},
							},
						},
					},
					commands: {
						createUser: {
							description: "Create a user",
							input: {
								name: {
									description: "User name",
									type: { kind: "primitive", name: "string" },
								},
							},
							output: { kind: "entity", name: "User" },
							emits: [{ name: "UserCreated", description: "User was created" }],
							errors: [],
							tags: [],
							uses: [{ aggregate: "User", access: "write" }],
						},
					},
					contracts: [],
					functions: {
						summarize: {
							description: "Summarize users",
							input: {},
							output: { kind: "type", name: "UserSummary" },
							errors: [],
							tags: [],
						},
					},
					invariants: [],
					dependencies: [],
				},
			},
		};

		const result = parseSchema(schema);
		const mainContext = result.contexts["main"];
		expect(mainContext?.entities["User"]).toBeDefined();
		expect(mainContext?.types?.["UserSummary"]).toBeDefined();
		expect(mainContext?.commands["createUser"]).toBeDefined();
		expect(mainContext?.functions?.["summarize"]).toBeDefined();
	});
});
