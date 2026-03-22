import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";

import { pluralize } from "./text";

describe("pluralize", () => {
	test("words ending in y → ies", () => {
		expect(pluralize("entity")).toBe("entities");
		expect(pluralize("query")).toBe("queries");
		expect(pluralize("category")).toBe("categories");
	});

	test("words ending in s → ses", () => {
		expect(pluralize("bus")).toBe("buses");
		expect(pluralize("class")).toBe("classes");
	});

	test("words ending in x → xes", () => {
		expect(pluralize("box")).toBe("boxes");
		expect(pluralize("index")).toBe("indexes");
	});

	test("words ending in ch → ches", () => {
		expect(pluralize("batch")).toBe("batches");
		expect(pluralize("match")).toBe("matches");
	});

	test("regular words → s", () => {
		expect(pluralize("item")).toBe("items");
		expect(pluralize("user")).toBe("users");
		expect(pluralize("todo")).toBe("todos");
	});

	test("single character", () => {
		expect(pluralize("a")).toBe("as");
	});

	test("property: output length >= input length", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-z]{1,20}$/), (input) => {
				expect(pluralize(input).length).toBeGreaterThanOrEqual(input.length);
			}),
		);
	});
});
