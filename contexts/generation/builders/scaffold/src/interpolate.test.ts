import { describe, expect, test } from "bun:test";

import { interpolate } from "./interpolate";

describe("interpolate", () => {
	test("replaces {{variable}} with value", () => {
		expect(interpolate("Hello {{name}}", { name: "World" })).toBe(
			"Hello World",
		);
	});

	test("replaces multiple variables", () => {
		expect(
			interpolate("{{greeting}} {{name}}!", {
				greeting: "Hello",
				name: "World",
			}),
		).toBe("Hello World!");
	});

	test("preserves unknown variables as {{key}}", () => {
		expect(interpolate("Hello {{name}}", {})).toBe("Hello {{name}}");
	});

	test("handles empty template", () => {
		expect(interpolate("", { name: "test" })).toBe("");
	});

	test("handles template without variables", () => {
		expect(interpolate("No vars here", { name: "test" })).toBe("No vars here");
	});

	test("handles empty variables map", () => {
		expect(interpolate("Hello {{name}}", {})).toBe("Hello {{name}}");
	});
});
