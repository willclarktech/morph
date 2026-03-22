import type { DslFoldingRange } from "@morph/schema-dsl-dsl";
import type { DomainAst, SourceRange } from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { parse } from "@morph/schema-dsl-parser";

export interface GetFoldingRangesHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<readonly DslFoldingRange[]>;
}

export const GetFoldingRangesHandler =
	Context.GenericTag<GetFoldingRangesHandler>(
		"@morph/impls/GetFoldingRangesHandler",
	);

const addRange = (ranges: DslFoldingRange[], range: SourceRange): void => {
	if (range.start.line < range.end.line) {
		ranges.push({ startLine: range.start.line, endLine: range.end.line });
	}
};

const collectFoldingRanges = (ast: DomainAst): DslFoldingRange[] => {
	const ranges: DslFoldingRange[] = [];

	addRange(ranges, ast.range);

	if (ast.extensions) {
		addRange(ranges, ast.extensions.range);
	}

	for (const ctx of ast.contexts) {
		addRange(ranges, ctx.range);

		for (const entity of ctx.entities) addRange(ranges, entity.range);
		for (const vo of ctx.valueObjects) addRange(ranges, vo.range);
		for (const cmd of ctx.commands) addRange(ranges, cmd.range);
		for (const query of ctx.queries) addRange(ranges, query.range);
		for (const fn of ctx.functions) addRange(ranges, fn.range);
		for (const inv of ctx.invariants) addRange(ranges, inv.range);
		for (const sub of ctx.subscribers) addRange(ranges, sub.range);
		for (const port of ctx.ports) addRange(ranges, port.range);
		for (const err of ctx.errors) addRange(ranges, err.range);
		for (const type of ctx.types) addRange(ranges, type.range);
	}

	return ranges;
};

export const GetFoldingRangesHandlerLive = Layer.succeed(
	GetFoldingRangesHandler,
	{
		handle: (params, _options) =>
			E.sync(() => {
				const parseResult = parse(params.source);
				if (!parseResult.ast) return [];
				return collectFoldingRanges(parseResult.ast);
			}),
	},
);
