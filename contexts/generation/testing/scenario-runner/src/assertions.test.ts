import { describe, expect, test } from "bun:test";

import { formatAssertionProse, getField, runAssertion } from "./assertions";

describe("runAssertion", () => {
	test("toBe passes on match", () => {
		expect(() =>
			runAssertion(42, { type: "toBe", expected: 42 }),
		).not.toThrow();
	});

	test("toBe fails on mismatch", () => {
		expect(() => runAssertion(42, { type: "toBe", expected: 99 })).toThrow(
			"Expected 99, got 42",
		);
	});

	test("toBe uses strict equality", () => {
		expect(() => runAssertion("42", { type: "toBe", expected: 42 })).toThrow();
	});

	test("toBeDefined passes for non-null value", () => {
		expect(() => runAssertion("hello", { type: "toBeDefined" })).not.toThrow();
	});

	test("toBeDefined fails for undefined", () => {
		expect(() => runAssertion(undefined, { type: "toBeDefined" })).toThrow(
			"Expected value to be defined",
		);
	});

	test("toBeDefined fails for null", () => {
		expect(() => runAssertion(null, { type: "toBeDefined" })).toThrow(
			"Expected value to be defined",
		);
	});

	test("toBeUndefined passes for undefined", () => {
		expect(() =>
			runAssertion(undefined, { type: "toBeUndefined" }),
		).not.toThrow();
	});

	test("toBeUndefined fails for defined value", () => {
		expect(() => runAssertion("hello", { type: "toBeUndefined" })).toThrow(
			"Expected undefined, got hello",
		);
	});

	test("toContain passes for array containing value", () => {
		expect(() =>
			runAssertion([1, 2, 3], { type: "toContain", expected: 2 }),
		).not.toThrow();
	});

	test("toContain fails for array not containing value", () => {
		expect(() =>
			runAssertion([1, 2, 3], { type: "toContain", expected: 4 }),
		).toThrow("Expected array to contain 4");
	});

	test("toContain passes for string containing substring", () => {
		expect(() =>
			runAssertion("hello world", { type: "toContain", expected: "world" }),
		).not.toThrow();
	});

	test("toContain fails for string not containing substring", () => {
		expect(() =>
			runAssertion("hello", { type: "toContain", expected: "world" }),
		).toThrow("Expected string to contain");
	});

	test("toContain throws TypeError for non-array/non-string", () => {
		expect(() => runAssertion(42, { type: "toContain", expected: 4 })).toThrow(
			"Expected array or string",
		);
	});

	test("toHaveLength passes on correct length", () => {
		expect(() =>
			runAssertion([1, 2, 3], { type: "toHaveLength", expected: 3 }),
		).not.toThrow();
	});

	test("toHaveLength fails on wrong length", () => {
		expect(() =>
			runAssertion([1, 2], { type: "toHaveLength", expected: 3 }),
		).toThrow("Expected length 3, got 2");
	});

	test("toHaveLength fails for non-array", () => {
		expect(() =>
			runAssertion("abc", { type: "toHaveLength", expected: 3 }),
		).toThrow("non-array");
	});
});

describe("getField", () => {
	test("returns field value from object", () => {
		expect(getField({ name: "test" }, "name")).toBe("test");
	});

	test("returns undefined for missing field", () => {
		expect(getField({ name: "test" }, "age")).toBeUndefined();
	});

	test("returns undefined for non-object", () => {
		expect(getField("hello", "length")).toBeUndefined();
	});

	test("returns undefined for null", () => {
		expect(getField(null, "field")).toBeUndefined();
	});

	test("returns undefined for undefined", () => {
		expect(getField(undefined, "field")).toBeUndefined();
	});
});

describe("formatAssertionProse", () => {
	test("toBe format", () => {
		expect(
			formatAssertionProse("result", ".name", {
				type: "toBe",
				expected: "test",
			}),
		).toBe('result.name is "test"');
	});

	test("toBeDefined format", () => {
		expect(formatAssertionProse("result", ".id", { type: "toBeDefined" })).toBe(
			"result.id is defined",
		);
	});

	test("toBeUndefined format", () => {
		expect(
			formatAssertionProse("result", ".error", { type: "toBeUndefined" }),
		).toBe("result.error is undefined");
	});

	test("toContain format", () => {
		expect(
			formatAssertionProse("result", ".items", {
				type: "toContain",
				expected: "apple",
			}),
		).toBe('result.items contains "apple"');
	});

	test("toHaveLength format", () => {
		expect(
			formatAssertionProse("result", ".items", {
				type: "toHaveLength",
				expected: 3,
			}),
		).toBe("result.items has length 3");
	});

	test("empty field", () => {
		expect(formatAssertionProse("result", "", { type: "toBeDefined" })).toBe(
			"result is defined",
		);
	});
});
