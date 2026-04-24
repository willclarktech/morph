import type { Layer } from "effect";

import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
	GetCompletionsHandler,
	GetCompletionsHandlerLive,
} from "./get-completions";
import {
	GetDefinitionHandler,
	GetDefinitionHandlerLive,
} from "./get-definition";
import {
	GetDiagnosticsHandler,
	GetDiagnosticsHandlerLive,
} from "./get-diagnostics";
import {
	GetFoldingRangesHandler,
	GetFoldingRangesHandlerLive,
} from "./get-folding-ranges";
import { GetHoverHandler, GetHoverHandlerLive } from "./get-hover";
import { GetSymbolsHandler, GetSymbolsHandlerLive } from "./get-symbols";

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

const run = <A>(
	effect: Effect.Effect<A, unknown, any>,
	layer: Layer.Layer<any>,
) => Effect.runPromise(Effect.provide(effect, layer) as Effect.Effect<A>);

describe("getDiagnostics", () => {
	test("returns empty for valid source", async () => {
		const result = await run(
			Effect.flatMap(GetDiagnosticsHandler, (h) =>
				h.handle({ source: VALID_SOURCE }, {}),
			),
			GetDiagnosticsHandlerLive,
		);
		expect(result).toEqual([]);
	});

	test("returns errors for invalid source", async () => {
		const result = await run(
			Effect.flatMap(GetDiagnosticsHandler, (h) =>
				h.handle({ source: INVALID_SOURCE }, {}),
			),
			GetDiagnosticsHandlerLive,
		);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]!.severity).toBe("error");
		expect(result[0]!.line).toBeGreaterThan(0);
	});
});

describe("getSymbols", () => {
	test("returns hierarchical symbols for valid source", async () => {
		const result = await run(
			Effect.flatMap(GetSymbolsHandler, (h) =>
				h.handle({ source: VALID_SOURCE }, {}),
			),
			GetSymbolsHandlerLive,
		);
		expect(result.length).toBe(1);
		expect(result[0]!.name).toBe("Todo");
		expect(result[0]!.kind).toBe("domain");
		expect(result[0]!.children.length).toBeGreaterThan(0);

		const contextNames = result[0]!.children.map((c) => c.name);
		expect(contextNames).toContain("tasks");
	});

	test("returns empty for unparseable source", async () => {
		const result = await run(
			Effect.flatMap(GetSymbolsHandler, (h) =>
				h.handle({ source: "{{{{ not valid" }, {}),
			),
			GetSymbolsHandlerLive,
		);
		expect(result).toEqual([]);
	});
});

describe("getCompletions", () => {
	test("suggests tags after @", async () => {
		const source = "domain Foo\n\ncontext bar {\n\tentity Baz @";
		const result = await run(
			Effect.flatMap(GetCompletionsHandler, (h) =>
				h.handle({ source, line: 4, column: 15 }, {}),
			),
			GetCompletionsHandlerLive,
		);
		const labels = result.map((c) => c.label);
		expect(labels).toContain("@api");
		expect(labels).toContain("@cli");
	});

	test("suggests types after colon", async () => {
		const source = "domain Foo\n\ncontext bar {\n\tentity Baz {\n\t\tname: ";
		const result = await run(
			Effect.flatMap(GetCompletionsHandler, (h) =>
				h.handle({ source, line: 5, column: 9 }, {}),
			),
			GetCompletionsHandlerLive,
		);
		const labels = result.map((c) => c.label);
		expect(labels).toContain("string");
		expect(labels).toContain("boolean");
	});

	test("suggests entity names after reads/writes", async () => {
		const source =
			"domain Foo\n\ncontext bar {\n\tentity Todo {\n\t\tx: string\n\t}\n\tcommand DoIt\n\t\treads Todo\n}";
		const result = await run(
			Effect.flatMap(GetCompletionsHandler, (h) =>
				h.handle({ source, line: 8, column: 9 }, {}),
			),
			GetCompletionsHandlerLive,
		);
		const labels = result.map((c) => c.label);
		expect(labels).toContain("Todo");
	});
});

describe("getHover", () => {
	test("returns hover info for entity keyword", async () => {
		const source =
			"domain Foo\n\ncontext bar {\n\tentity Todo {\n\t\tx: string\n\t}\n}";
		const result = await run(
			Effect.flatMap(GetHoverHandler, (h) =>
				h.handle({ source, line: 4, column: 10 }, {}),
			),
			GetHoverHandlerLive,
		);
		expect(result.content.length).toBeGreaterThan(0);
	});
});

describe("getDefinition", () => {
	test("returns location for entity reference in reads clause", async () => {
		const result = await run(
			Effect.flatMap(GetDefinitionHandler, (h) =>
				h.handle({ source: VALID_SOURCE, line: 137, column: 10 }, {}),
			),
			GetDefinitionHandlerLive,
		);
		expect(result.range.startLine).toBeGreaterThan(0);
	});

	test("returns zero range for unknown word", async () => {
		const result = await run(
			Effect.flatMap(GetDefinitionHandler, (h) =>
				h.handle({ source: "domain Foo\n", line: 1, column: 1 }, {}),
			),
			GetDefinitionHandlerLive,
		);
		expect(result.range.startLine).toBe(0);
	});
});

describe("getFoldingRanges", () => {
	test("returns folding ranges for blocks", async () => {
		const result = await run(
			Effect.flatMap(GetFoldingRangesHandler, (h) =>
				h.handle({ source: VALID_SOURCE }, {}),
			),
			GetFoldingRangesHandlerLive,
		);
		expect(result.length).toBeGreaterThan(0);
	});

	test("returns empty for unparseable source", async () => {
		const result = await run(
			Effect.flatMap(GetFoldingRangesHandler, (h) =>
				h.handle({ source: "{{{{" }, {}),
			),
			GetFoldingRangesHandlerLive,
		);
		expect(result).toEqual([]);
	});
});
