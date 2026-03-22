import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";

import { sortObjectKeys } from "./object";

describe("sortObjectKeys", () => {
	test("sorts top-level keys alphabetically", () => {
		const result = sortObjectKeys({ b: 1, a: 2, c: 3 });
		expect(Object.keys(result)).toEqual(["a", "b", "c"]);
	});

	test("preserves values", () => {
		const result = sortObjectKeys({ b: 1, a: 2 });
		expect(result).toEqual({ a: 2, b: 1 });
	});

	test("recursively sorts nested objects", () => {
		const result = sortObjectKeys({ b: { d: 1, c: 2 }, a: 3 });
		expect(Object.keys(result)).toEqual(["a", "b"]);
		expect(Object.keys(result.b as Record<string, unknown>)).toEqual([
			"c",
			"d",
		]);
	});

	test("leaves arrays unchanged", () => {
		const result = sortObjectKeys({ b: [3, 1, 2], a: 1 });
		expect(result.b).toEqual([3, 1, 2]);
	});

	test("handles empty object", () => {
		expect(sortObjectKeys({})).toEqual({});
	});

	test("handles already sorted keys", () => {
		const result = sortObjectKeys({ a: 1, b: 2, c: 3 });
		expect(Object.keys(result)).toEqual(["a", "b", "c"]);
	});

	test("property: output has same keys as input", () => {
		const safeKey = fc
			.string()
			.filter((s) => s !== "__proto__" && s !== "constructor");
		fc.assert(
			fc.property(fc.dictionary(safeKey, fc.integer()), (input) => {
				const result = sortObjectKeys(input);
				expect(Object.keys(result).sort()).toEqual(Object.keys(input).sort());
			}),
		);
	});

	test("property: values are preserved", () => {
		const safeKey = fc
			.string()
			.filter((s) => s !== "__proto__" && s !== "constructor");
		fc.assert(
			fc.property(fc.dictionary(safeKey, fc.integer()), (input) => {
				const result = sortObjectKeys(input);
				for (const key of Object.keys(input)) {
					expect(result[key]).toBe(input[key]);
				}
			}),
		);
	});
});
