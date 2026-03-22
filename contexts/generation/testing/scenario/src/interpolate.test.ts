import { describe, expect, test } from "bun:test";

import { interpolate } from "./interpolate";

describe("interpolate", () => {
	test("replaces {param} with string value", () => {
		expect(interpolate("Hello {name}", { name: "Alice" })).toBe("Hello Alice");
	});

	test("replaces {param} with JSON-stringified non-string value", () => {
		expect(interpolate("Count: {count}", { count: 42 })).toBe("Count: 42");
	});

	test("replaces {actor} from context", () => {
		expect(interpolate("{actor} says hello", {}, { actor: "Taylor" })).toBe(
			"Taylor says hello",
		);
	});

	test("does not replace {actor} without context", () => {
		expect(interpolate("{actor} says hello", {})).toBe("{actor} says hello");
	});

	test("processes conditionals when param is truthy", () => {
		expect(interpolate("[title? titled {title}]", { title: "My Todo" })).toBe(
			"titled My Todo",
		);
	});

	test("removes conditionals when param is falsy", () => {
		expect(interpolate("Hello[title? titled {title}] world", {})).toBe(
			"Hello world",
		);
	});

	test("handles multiple params", () => {
		expect(
			interpolate("{first} and {second}", { first: "A", second: "B" }),
		).toBe("A and B");
	});

	test("handles missing params by leaving placeholder", () => {
		expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
	});

	test("handles boolean param in conditional", () => {
		expect(interpolate("[active? is active]", { active: true })).toBe(
			"is active",
		);
	});

	test("conditional removes when value is false", () => {
		expect(interpolate("[active? is active]", { active: false })).toBe("");
	});

	test("conditional removes when value is empty string", () => {
		expect(interpolate("[name? named {name}]", { name: "" })).toBe("");
	});

	test("actor and params combined", () => {
		expect(
			interpolate("{actor} creates {item}", { item: "todo" }, { actor: "Taylor" }),
		).toBe("Taylor creates todo");
	});
});
