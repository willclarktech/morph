import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "@morphdsl/domain-schema";
import type { PluginContext } from "@morphdsl/plugin";
import type { SchemaFeatures } from "@morphdsl/builder-app";

import { apiPlugin } from "./index";

const makeContext = (overrides?: {
	schema?: Partial<DomainSchema>;
	features?: Partial<SchemaFeatures>;
}): PluginContext => ({
	name: "TestApp",
	schema: {
		name: "TestApp",
		contexts: {
			tasks: {
				description: "Task management",
				entities: {
					Todo: {
						description: "A task",
						attributes: {
							title: {
								type: { kind: "primitive", name: "string" },
								description: "Title",
							},
							completed: {
								type: { kind: "primitive", name: "boolean" },
								description: "Done?",
							},
						},
						aggregate: { root: true },
						relationships: [],
					},
				},
				commands: {
					createTodo: {
						description: "Create a todo",
						input: {
							title: {
								type: { kind: "primitive", name: "string" },
								description: "Title",
							},
						},
						output: { kind: "entity", name: "Todo" },
						emits: [],
						errors: [],
						tags: ["@api", "@cli", "@mcp"],
						uses: [{ aggregate: "Todo", access: "write" }],
					},
				},
				queries: {
					listTodos: {
						description: "List todos",
						input: {},
						output: { kind: "primitive", name: "string" },
						errors: [],
						tags: ["@api", "@cli"],
						uses: [{ aggregate: "Todo", access: "read" }],
					},
				},
				functions: {},
				invariants: [],
				dependencies: [],
			} as ContextDef,
		},
		...overrides?.schema,
	},
	features: {
		hasAuth: false,
		hasEntities: true,
		hasEvents: false,
		hasPropertyTests: false,
		primaryContext: "tasks",
		...overrides?.features,
	},
});

describe("apiPlugin", () => {
	test("generates expected file set", () => {
		const ctx = makeContext();
		const files = apiPlugin.generate(ctx);
		const filenames = files.map((f) => f.filename).sort();

		expect(filenames).toContain("apps/api/package.json");
		expect(filenames).toContain("apps/api/src/index.ts");
		expect(filenames).toContain("apps/api/src/test/scenarios.test.ts");
		expect(filenames).toContain("apps/api/Dockerfile");
		expect(filenames).toContain("apps/api/.env.example");
	});

	test("generates OpenAPI spec", () => {
		const ctx = makeContext();
		const files = apiPlugin.generate(ctx);
		const openApiFile = files.find((f) => f.filename.includes("openapi"));

		expect(openApiFile).toBeDefined();
		expect(openApiFile!.content).toContain("openapi");
	});

	test("package.json has correct name", () => {
		const ctx = makeContext();
		const files = apiPlugin.generate(ctx);
		const pkgFile = files.find((f) => f.filename === "apps/api/package.json");

		expect(pkgFile).toBeDefined();
		expect(pkgFile!.content).toContain("@testapp/api");
	});

	test("entry point imports from core package", () => {
		const ctx = makeContext();
		const files = apiPlugin.generate(ctx);
		const entryFile = files.find(
			(f) => f.filename === "apps/api/src/index.ts",
		);

		expect(entryFile).toBeDefined();
		expect(entryFile!.content).toContain("@testapp/tasks-core");
	});

	test("scenario test imports runner", () => {
		const ctx = makeContext();
		const files = apiPlugin.generate(ctx);
		const testFile = files.find((f) =>
			f.filename.includes("scenarios.test.ts"),
		);

		expect(testFile).toBeDefined();
		expect(testFile!.content).toContain("createApiRunner");
		expect(testFile!.content).toContain("@testapp/scenarios");
	});
});
