import { describe, expect, test } from "bun:test";

import {
	bold,
	code,
	codeBlock,
	heading,
	joinSections,
	link,
	list,
	table,
} from "./markdown";

describe("heading", () => {
	test("level 1", () => {
		expect(heading(1, "Title")).toBe("# Title");
	});

	test("level 2", () => {
		expect(heading(2, "Section")).toBe("## Section");
	});

	test("level 3", () => {
		expect(heading(3, "Subsection")).toBe("### Subsection");
	});

	test("level 6", () => {
		expect(heading(6, "Deep")).toBe("###### Deep");
	});
});

describe("table", () => {
	test("generates header, separator, and rows", () => {
		const result = table(["Name", "Type"], [["id", "string"]]);
		expect(result).toContain("| Name | Type |");
		expect(result).toContain("| --- | --- |");
		expect(result).toContain("| id | string |");
	});

	test("handles multiple rows", () => {
		const result = table(
			["A", "B"],
			[
				["1", "2"],
				["3", "4"],
			],
		);
		const lines = result.split("\n");
		expect(lines).toHaveLength(4);
	});

	test("returns empty string for empty headers", () => {
		expect(table([], [])).toBe("");
	});

	test("handles empty rows", () => {
		const result = table(["A"], []);
		expect(result).toContain("| A |");
		expect(result).toContain("| --- |");
	});
});

describe("codeBlock", () => {
	test("wraps in fences with language", () => {
		expect(codeBlock("const x = 1;", "ts")).toBe("```ts\nconst x = 1;\n```");
	});

	test("wraps without language", () => {
		expect(codeBlock("hello")).toBe("```\nhello\n```");
	});

	test("preserves multi-line content", () => {
		const result = codeBlock("line1\nline2", "sh");
		expect(result).toBe("```sh\nline1\nline2\n```");
	});
});

describe("list", () => {
	test("creates bullet list", () => {
		expect(list(["a", "b", "c"])).toBe("- a\n- b\n- c");
	});

	test("single item", () => {
		expect(list(["only"])).toBe("- only");
	});

	test("empty array", () => {
		expect(list([])).toBe("");
	});
});

describe("link", () => {
	test("creates markdown link", () => {
		expect(link("Click", "https://example.com")).toBe(
			"[Click](https://example.com)",
		);
	});
});

describe("code", () => {
	test("wraps in backticks", () => {
		expect(code("foo")).toBe("`foo`");
	});
});

describe("bold", () => {
	test("wraps in double asterisks", () => {
		expect(bold("important")).toBe("**important**");
	});
});

describe("joinSections", () => {
	test("joins with double newlines", () => {
		expect(joinSections(["a", "b", "c"])).toBe("a\n\nb\n\nc");
	});

	test("filters empty strings", () => {
		expect(joinSections(["a", "", "c"])).toBe("a\n\nc");
	});

	test("returns empty string for all empty", () => {
		expect(joinSections(["", ""])).toBe("");
	});

	test("single section", () => {
		expect(joinSections(["only"])).toBe("only");
	});
});
