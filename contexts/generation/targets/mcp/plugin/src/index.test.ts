import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "@morphdsl/domain-schema";
import type { PluginContext } from "@morphdsl/plugin";
import type { SchemaFeatures } from "@morphdsl/builder-app";

import { mcpPlugin } from "./index";

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
						tags: ["@mcp"],
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

describe("mcpPlugin", () => {
	test("generates expected file set", () => {
		const ctx = makeContext();
		const files = mcpPlugin.generate(ctx);
		const filenames = files.map((f) => f.filename).sort();

		expect(filenames).toContain("apps/mcp/package.json");
		expect(filenames).toContain("apps/mcp/src/index.ts");
		expect(filenames).toContain("apps/mcp/src/test/scenarios.test.ts");
		expect(filenames).toContain("apps/mcp/Dockerfile");
		expect(filenames).toContain("apps/mcp/.env.example");
	});

	test("package.json has correct name", () => {
		const ctx = makeContext();
		const files = mcpPlugin.generate(ctx);
		const pkgFile = files.find(
			(f) => f.filename === "apps/mcp/package.json",
		);

		expect(pkgFile).toBeDefined();
		expect(pkgFile!.content).toContain("@TestApp/mcp");
	});

	test("entry point imports ops and creates MCP server", () => {
		const ctx = makeContext();
		const files = mcpPlugin.generate(ctx);
		const entryFile = files.find(
			(f) => f.filename === "apps/mcp/src/index.ts",
		);

		expect(entryFile).toBeDefined();
		expect(entryFile!.content).toContain("createMcp");
		expect(entryFile!.content).toContain("@testapp/tasks-core");
	});

	test("scenario test imports MCP runner", () => {
		const ctx = makeContext();
		const files = mcpPlugin.generate(ctx);
		const testFile = files.find((f) =>
			f.filename.includes("scenarios.test.ts"),
		);

		expect(testFile).toBeDefined();
		expect(testFile!.content).toContain("createMcpRunner");
		expect(testFile!.content).toContain("@testapp/scenarios");
	});

	test("generates README", () => {
		const ctx = makeContext();
		const files = mcpPlugin.generate(ctx);
		const readmeFile = files.find((f) =>
			f.filename.includes("README.md"),
		);

		expect(readmeFile).toBeDefined();
		expect(readmeFile!.content).toContain("TestApp");
	});
});
