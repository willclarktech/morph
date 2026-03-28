import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { describe, expect, test } from "bun:test";

import type { GeneratorPlugin, PluginContext } from "./interface";

import {
	runPlugins,
	runPluginsWithResults,
	validatePluginGraph,
} from "./registry";

const makeSchema = (contexts: DomainSchema["contexts"] = {}): DomainSchema => ({
	name: "test",
	contexts,
});

const makeContext = (overrides?: Partial<PluginContext>): PluginContext => ({
	schema: makeSchema(),
	name: "test",
	features: {
		hasAuth: false,
		hasEntities: false,
		hasEvents: false,
		hasPropertyTests: false,
		primaryContext: undefined,
	},
	...overrides,
});

const makePlugin = (
	overrides: Partial<GeneratorPlugin> & { id: string },
): GeneratorPlugin => ({
	kind: "lib",
	generate: () => [],
	...overrides,
});

const file = (filename: string): GeneratedFile => ({
	filename,
	content: filename,
});

describe("validatePluginGraph", () => {
	test("returns empty for valid graph", () => {
		const plugins = [
			makePlugin({ id: "a" }),
			makePlugin({ id: "b", dependencies: ["a"] }),
		];
		const errors = validatePluginGraph(plugins, makeContext());
		expect(errors).toEqual([]);
	});

	test("returns empty for no plugins", () => {
		expect(validatePluginGraph([], makeContext())).toEqual([]);
	});

	test("reports missing dependency", () => {
		const plugins = [makePlugin({ id: "a", dependencies: ["nonexistent"] })];
		const errors = validatePluginGraph(plugins, makeContext());
		expect(errors).toHaveLength(1);
		expect(errors[0]!.plugin).toBe("a");
		expect(errors[0]!.missingDep).toBe("nonexistent");
		expect(errors[0]!.reason).toBe("dependency not registered");
	});

	test("skips inactive plugins in validation", () => {
		const plugins = [
			makePlugin({
				id: "a",
				tags: ["nonexistent-tag"],
				dependencies: ["missing"],
			}),
		];
		const errors = validatePluginGraph(plugins, makeContext());
		expect(errors).toEqual([]);
	});

	test("reports inactive dependency for tagged plugin", () => {
		const context = makeContext({
			schema: makeSchema({
				main: {
					description: "test",
					entities: {},
					commands: {
						doStuff: {
							description: "do stuff",
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
			}),
		});
		const plugins = [
			makePlugin({ id: "dep", tags: ["cli"] }),
			makePlugin({ id: "consumer", tags: ["api"], dependencies: ["dep"] }),
		];
		const errors = validatePluginGraph(plugins, context);
		expect(errors).toHaveLength(1);
		expect(errors[0]!.plugin).toBe("consumer");
		expect(errors[0]!.missingDep).toBe("dep");
		expect(errors[0]!.reason).toContain("tag");
	});

	test("valid graph with multiple dependencies", () => {
		const plugins = [
			makePlugin({ id: "a" }),
			makePlugin({ id: "b" }),
			makePlugin({ id: "c", dependencies: ["a", "b"] }),
		];
		expect(validatePluginGraph(plugins, makeContext())).toEqual([]);
	});
});

describe("runPlugins", () => {
	test("runs plugins in toposort order", () => {
		const order: string[] = [];
		const plugins = [
			makePlugin({
				id: "b",
				dependencies: ["a"],
				generate: () => {
					order.push("b");
					return [];
				},
			}),
			makePlugin({
				id: "a",
				generate: () => {
					order.push("a");
					return [];
				},
			}),
		];
		runPlugins(plugins, makeContext());
		expect(order).toEqual(["a", "b"]);
	});

	test("collects files from all plugins", () => {
		const plugins = [
			makePlugin({
				id: "a",
				generate: () => [file("a.ts")],
			}),
			makePlugin({
				id: "b",
				generate: () => [file("b.ts")],
			}),
		];
		const files = runPlugins(plugins, makeContext());
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.filename)).toEqual(["a.ts", "b.ts"]);
	});

	test("skips plugins with unmatched tags", () => {
		const plugins = [
			makePlugin({
				id: "a",
				tags: ["nonexistent-tag"],
				generate: () => [file("a.ts")],
			}),
		];
		const files = runPlugins(plugins, makeContext());
		expect(files).toHaveLength(0);
	});

	test("runs plugins with matching tags", () => {
		const context = makeContext({
			schema: makeSchema({
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
			}),
		});
		const plugins = [
			makePlugin({
				id: "a",
				tags: ["api"],
				generate: () => [file("api.ts")],
			}),
		];
		const files = runPlugins(plugins, context);
		expect(files).toHaveLength(1);
	});

	test("throws on dependency errors", () => {
		const plugins = [makePlugin({ id: "a", dependencies: ["missing"] })];
		expect(() => runPlugins(plugins, makeContext())).toThrow(
			"Plugin dependency errors",
		);
	});

	test("skips plugin when dependency was skipped", () => {
		const plugins = [
			makePlugin({ id: "dep", tags: ["nonexistent-tag"] }),
			makePlugin({
				id: "consumer",
				dependencies: ["dep"],
				generate: () => [file("c.ts")],
			}),
		];
		const files = runPlugins(plugins, makeContext());
		expect(files).toHaveLength(0);
	});

	test("plugins without tags always run", () => {
		const plugins = [
			makePlugin({
				id: "a",
				generate: () => [file("a.ts")],
			}),
		];
		const files = runPlugins(plugins, makeContext());
		expect(files).toHaveLength(1);
	});

	test("enriches context with plugin metadata", () => {
		let capturedContext: PluginContext | undefined;
		const plugins = [
			makePlugin({
				id: "a",
				metadata: {
					quickStartSteps: [{ description: "Run", command: "bun run" }],
				},
				generate: (context) => {
					capturedContext = context;
					return [];
				},
			}),
		];
		runPlugins(plugins, makeContext());
		expect(capturedContext!.pluginMetadata).toBeDefined();
		expect(capturedContext!.pluginMetadata).toHaveLength(1);
		expect(capturedContext!.pluginMetadata![0]!.pluginId).toBe("a");
	});
});

describe("runPluginsWithResults", () => {
	test("returns results with pluginId and files", () => {
		const plugins = [
			makePlugin({
				id: "a",
				generate: () => [file("a.ts")],
			}),
			makePlugin({
				id: "b",
				dependencies: ["a"],
				generate: () => [file("b.ts")],
			}),
		];
		const results = runPluginsWithResults(plugins, makeContext());
		expect(results).toHaveLength(2);
		expect(results[0]!.pluginId).toBe("a");
		expect(results[0]!.files).toHaveLength(1);
		expect(results[1]!.pluginId).toBe("b");
		expect(results[1]!.files).toHaveLength(1);
	});

	test("throws on dependency errors", () => {
		const plugins = [makePlugin({ id: "a", dependencies: ["missing"] })];
		expect(() => runPluginsWithResults(plugins, makeContext())).toThrow(
			"Plugin dependency errors",
		);
	});

	test("excludes skipped plugins from results", () => {
		const plugins = [
			makePlugin({ id: "a", tags: ["nonexistent-tag"], generate: () => [] }),
			makePlugin({ id: "b", generate: () => [file("b.ts")] }),
		];
		const results = runPluginsWithResults(plugins, makeContext());
		expect(results).toHaveLength(1);
		expect(results[0]!.pluginId).toBe("b");
	});
});
