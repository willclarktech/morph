import { describe, expect, test } from "bun:test";

import type { ContextDef, DomainSchema } from "@morph/domain-schema";
import type { PluginContext } from "@morph/plugin";
import type { SchemaFeatures } from "@morph/builder-app";

import { cliPlugin } from "./index";

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

describe("cliPlugin", () => {
	test("generates expected file set", () => {
		const ctx = makeContext();
		const files = cliPlugin.generate(ctx);
		const filenames = files.map((f) => f.filename).sort();

		expect(filenames).toContain("apps/cli/package.json");
		expect(filenames).toContain("apps/cli/src/index.ts");
		expect(filenames).toContain("apps/cli/src/test/scenarios.test.ts");
		expect(filenames).toContain("apps/cli/Dockerfile");
		expect(filenames).toContain("apps/cli/.env.example");
	});

	test("package.json has correct name", () => {
		const ctx = makeContext();
		const files = cliPlugin.generate(ctx);
		const pkgFile = files.find(
			(f) => f.filename === "apps/cli/package.json",
		);

		expect(pkgFile).toBeDefined();
		expect(pkgFile!.content).toContain("@testapp/cli");
	});

	test("entry point imports from core package", () => {
		const ctx = makeContext();
		const files = cliPlugin.generate(ctx);
		const entryFile = files.find(
			(f) => f.filename === "apps/cli/src/index.ts",
		);

		expect(entryFile).toBeDefined();
		expect(entryFile!.content).toContain("@testapp/tasks-core");
	});

	test("scenario test imports CLI runner", () => {
		const ctx = makeContext();
		const files = cliPlugin.generate(ctx);
		const testFile = files.find((f) =>
			f.filename.includes("scenarios.test.ts"),
		);

		expect(testFile).toBeDefined();
		expect(testFile!.content).toContain("createCliRunner");
		expect(testFile!.content).toContain("@testapp/scenarios");
	});

	test("does not generate property tests when hasPropertyTests is false", () => {
		const ctx = makeContext({ features: { hasPropertyTests: false } });
		const files = cliPlugin.generate(ctx);
		const propertyFile = files.find((f) =>
			f.filename.includes("properties.test.ts"),
		);

		expect(propertyFile).toBeUndefined();
	});

	test("generates property tests when hasPropertyTests is true", () => {
		const ctx = makeContext({ features: { hasPropertyTests: true } });
		const files = cliPlugin.generate(ctx);
		const propertyFile = files.find((f) =>
			f.filename.includes("properties.test.ts"),
		);

		expect(propertyFile).toBeDefined();
	});
});
