import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { getCompletions } from "./get-completions";
import { getDefinition } from "./get-definition";
import { getDiagnostics } from "./get-diagnostics";
import { getFoldingRanges } from "./get-folding-ranges";
import { getHover } from "./get-hover";
import { getSymbols } from "./get-symbols";

const VALID_SOURCE = readFileSync(
	path.resolve(
		import.meta.dir,
		"../../../../examples/fixtures/todo/schema.morph",
	),
	"utf8",
);

const INVALID_SOURCE = `domain Broken

context stuff {
	entity Foo {
		name:
	}
}
`;

describe("getDiagnostics", () => {
	test("returns empty for valid source", () => {
		expect(getDiagnostics({ source: VALID_SOURCE }, {})).toEqual([]);
	});

	test("returns errors for invalid source", () => {
		const result = getDiagnostics({ source: INVALID_SOURCE }, {});
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.severity).toBe("error");
		expect(result[0]!.line).toBeGreaterThan(0);
	});
});

describe("getSymbols", () => {
	test("returns hierarchical symbols for valid source", () => {
		const result = getSymbols({ source: VALID_SOURCE }, {});
		expect(result.length).toBe(1);
		expect(result[0]!.name).toBe("Todo");
		expect(result[0]!.kind).toBe("domain");
		expect(result[0]!.children.length).toBeGreaterThan(0);

		const contextNames = result[0]!.children.map((c) => c.name);
		expect(contextNames).toContain("tasks");
	});

	test("returns empty for unparseable source", () => {
		expect(getSymbols({ source: "{{{{ not valid" }, {})).toEqual([]);
	});
});

describe("getCompletions", () => {
	test("suggests tags after @", () => {
		const source = "domain Foo\n\ncontext bar {\n\tentity Baz @";
		const result = getCompletions({ source, line: 4, column: 15 }, {});
		const labels = result.map((c) => c.label);
		expect(labels).toContain("@api");
		expect(labels).toContain("@cli");
	});

	test("suggests types after colon", () => {
		const source = "domain Foo\n\ncontext bar {\n\tentity Baz {\n\t\tname: ";
		const result = getCompletions({ source, line: 5, column: 9 }, {});
		const labels = result.map((c) => c.label);
		expect(labels).toContain("string");
		expect(labels).toContain("boolean");
	});

	test("suggests entity names after reads/writes", () => {
		const source =
			"domain Foo\n\ncontext bar {\n\tentity Todo {\n\t\tx: string\n\t}\n\tcommand DoIt\n\t\treads Todo\n}";
		const result = getCompletions({ source, line: 8, column: 9 }, {});
		const labels = result.map((c) => c.label);
		expect(labels).toContain("Todo");
	});
});

describe("getHover", () => {
	test("returns hover info for entity keyword", () => {
		const source =
			"domain Foo\n\ncontext bar {\n\tentity Todo {\n\t\tx: string\n\t}\n}";
		const result = getHover({ source, line: 4, column: 10 }, {});
		expect(result.content.length).toBeGreaterThan(0);
	});
});

describe("getDefinition", () => {
	test("returns location for entity reference in reads clause", () => {
		const result = getDefinition(
			{ source: VALID_SOURCE, line: 137, column: 10 },
			{},
		);
		expect(result.range.startLine).toBeGreaterThan(0);
	});

	test("returns zero range for unknown word", () => {
		const result = getDefinition(
			{ source: "domain Foo\n", line: 1, column: 1 },
			{},
		);
		expect(result.range.startLine).toBe(0);
	});
});

describe("getFoldingRanges", () => {
	test("returns folding ranges for blocks", () => {
		expect(
			getFoldingRanges({ source: VALID_SOURCE }, {}).length,
		).toBeGreaterThan(0);
	});

	test("returns empty for unparseable source", () => {
		expect(getFoldingRanges({ source: "{{{{" }, {})).toEqual([]);
	});
});
