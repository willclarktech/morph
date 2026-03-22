import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";

import {
	configProps,
	indent,
	indentBlock,
	joinLines,
	lines,
	sep,
} from "./template";

describe("lines", () => {
	test("joins defined strings with newlines", () => {
		expect(lines(["a", "b", "c"])).toBe("a\nb\nc");
	});

	test("filters out undefined values", () => {
		expect(lines(["a", undefined, "c"])).toBe("a\nc");
	});

	test("filters out empty strings", () => {
		expect(lines(["a", "", "c"])).toBe("a\nc");
	});

	test("returns empty string for all undefined", () => {
		expect(lines([undefined, undefined])).toBe("");
	});

	test("returns empty string for empty array", () => {
		expect(lines([])).toBe("");
	});

	test("handles single item", () => {
		expect(lines(["only"])).toBe("only");
	});

	test("property: output line count <= input array length", () => {
		fc.assert(
			fc.property(
				fc.array(fc.option(fc.string({ minLength: 1 }), { nil: undefined })),
				(items) => {
					const result = lines(items);
					const outputLines = result === "" ? 0 : result.split("\n").length;
					expect(outputLines).toBeLessThanOrEqual(items.length);
				},
			),
		);
	});
});

describe("indent", () => {
	test("indents all lines by given level", () => {
		expect(indent("foo\nbar", 2)).toBe("\t\tfoo\n\t\tbar");
	});

	test("preserves empty lines without whitespace", () => {
		expect(indent("foo\n\nbar", 1)).toBe("\tfoo\n\n\tbar");
	});

	test("handles single line", () => {
		expect(indent("hello", 3)).toBe("\t\t\thello");
	});

	test("handles zero indentation", () => {
		expect(indent("foo\nbar", 0)).toBe("foo\nbar");
	});

	test("handles empty string", () => {
		expect(indent("", 2)).toBe("");
	});

	test("preserves whitespace-only lines as empty", () => {
		expect(indent("foo\n   \nbar", 1)).toBe("\tfoo\n   \n\tbar");
	});
});

describe("indentBlock", () => {
	test("leaves first line unchanged", () => {
		expect(indentBlock("foo\nbar\nbaz", 2)).toBe("foo\n\t\tbar\n\t\tbaz");
	});

	test("handles single line (no indentation needed)", () => {
		expect(indentBlock("foo", 2)).toBe("foo");
	});

	test("preserves empty lines", () => {
		expect(indentBlock("foo\n\nbaz", 1)).toBe("foo\n\n\tbaz");
	});

	test("handles zero indentation", () => {
		expect(indentBlock("foo\nbar", 0)).toBe("foo\nbar");
	});

	test("handles empty string", () => {
		expect(indentBlock("", 2)).toBe("");
	});
});

describe("sep", () => {
	test("creates newline + tabs separator", () => {
		expect(sep(3)).toBe("\n\t\t\t");
	});

	test("adds pre-separator", () => {
		expect(sep(1, ",")).toBe(",\n\t");
	});

	test("adds post-separator", () => {
		expect(sep(1, "", "| ")).toBe("\n\t| ");
	});

	test("adds both pre and post", () => {
		expect(sep(2, ";", "- ")).toBe(";\n\t\t- ");
	});

	test("zero level creates just newline", () => {
		expect(sep(0)).toBe("\n");
	});

	test("can be used with Array.join", () => {
		const items = ["a", "b", "c"];
		expect(items.join(sep(2))).toBe("a\n\t\tb\n\t\tc");
	});
});

describe("joinLines", () => {
	test("joins items with newline + tabs", () => {
		expect(joinLines(["a", "b"], 2)).toBe("a\n\t\tb");
	});

	test("filters out undefined values", () => {
		expect(joinLines(["a", undefined, "c"], 1)).toBe("a\n\tc");
	});

	test("filters out empty strings", () => {
		expect(joinLines(["a", "", "c"], 1)).toBe("a\n\tc");
	});

	test("handles single item", () => {
		expect(joinLines(["only"], 3)).toBe("only");
	});

	test("handles empty array", () => {
		expect(joinLines([], 1)).toBe("");
	});
});

describe("configProps", () => {
	test("keeps string values", () => {
		expect(configProps(["a", "b"])).toEqual(["a", "b"]);
	});

	test("filters out false values", () => {
		expect(configProps([false, "a", false, "b"])).toEqual(["a", "b"]);
	});

	test("filters out undefined values", () => {
		expect(configProps([undefined, "a", undefined])).toEqual(["a"]);
	});

	test("filters mixed falsy values", () => {
		expect(configProps([false, undefined, "only"])).toEqual(["only"]);
	});

	test("returns empty array for all falsy", () => {
		expect(configProps([false, undefined, false])).toEqual([]);
	});

	test("returns empty array for empty input", () => {
		expect(configProps([])).toEqual([]);
	});

	test("conditional pattern works as expected", () => {
		const hasAuth = false;
		const props = configProps([
			hasAuth && "auth: authStrategy,",
			"required: true,",
		]);
		expect(props).toEqual(["required: true,"]);
	});
});
