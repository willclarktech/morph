import { describe, expect, test } from "bun:test";

import { interpolateBindings, resolveParameters } from "./bindings";

describe("resolveParameters", () => {
	test("passes through non-binding values", () => {
		const bindings = new Map<string, unknown>();
		const result = resolveParameters({ name: "test", count: 42 }, bindings);
		expect(result).toEqual({ name: "test", count: 42 });
	});

	test("resolves $binding references", () => {
		const bindings = new Map<string, unknown>([
			["user", { id: "u1", name: "Alice" }],
		]);
		const result = resolveParameters({ userId: "$user" }, bindings);
		expect(result).toEqual({ userId: { id: "u1", name: "Alice" } });
	});

	test("resolves dot-path bindings", () => {
		const bindings = new Map<string, unknown>([
			["user", { id: "u1", name: "Alice" }],
		]);
		const result = resolveParameters({ userId: "$user.id" }, bindings);
		expect(result).toEqual({ userId: "u1" });
	});

	test("returns undefined for unresolved binding", () => {
		const bindings = new Map<string, unknown>();
		const result = resolveParameters({ userId: "$missing" }, bindings);
		expect(result).toEqual({ userId: undefined });
	});

	test("skips undefined values for injectable params", () => {
		const bindings = new Map<string, unknown>();
		const result = resolveParameters(
			{ userId: "$missing", name: "test" },
			bindings,
			["userId"],
		);
		expect(result).toEqual({ name: "test" });
	});

	test("includes resolved values even for injectable params", () => {
		const bindings = new Map<string, unknown>([["user", { id: "u1" }]]);
		const result = resolveParameters({ userId: "$user.id" }, bindings, [
			"userId",
		]);
		expect(result).toEqual({ userId: "u1" });
	});

	test("returns non-object params as-is", () => {
		const bindings = new Map<string, unknown>();
		expect(resolveParameters("hello", bindings)).toBe("hello");
		expect(resolveParameters(42, bindings)).toBe(42);
		expect(resolveParameters(null, bindings)).toBeNull();
	});
});

describe("interpolateBindings", () => {
	test("replaces {$binding} with value", () => {
		const bindings = new Map<string, unknown>([["name", "Alice"]]);
		expect(interpolateBindings("Hello {$name}", bindings)).toBe("Hello Alice");
	});

	test("replaces {$binding.path} with nested value", () => {
		const bindings = new Map<string, unknown>([["user", { name: "Alice" }]]);
		expect(interpolateBindings("Hello {$user.name}", bindings)).toBe(
			"Hello Alice",
		);
	});

	test("keeps original placeholder for unresolved bindings", () => {
		const bindings = new Map<string, unknown>();
		expect(interpolateBindings("Hello {$name}", bindings)).toBe(
			"Hello {$name}",
		);
	});

	test("stringifies non-string values", () => {
		const bindings = new Map<string, unknown>([["count", 42]]);
		expect(interpolateBindings("Count: {$count}", bindings)).toBe("Count: 42");
	});

	test("handles multiple replacements", () => {
		const bindings = new Map<string, unknown>([
			["first", "Alice"],
			["last", "Smith"],
		]);
		expect(interpolateBindings("{$first} {$last}", bindings)).toBe(
			"Alice Smith",
		);
	});
});
