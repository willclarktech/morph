import type { DslFoldingRange } from "@morph/schema-dsl-dsl";
import type { DomainAst, SourceRange } from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { parse } from "@morph/schema-dsl-parser";
import { Context, Effect as E, Layer } from "effect";

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

	for (const context of ast.contexts) {
		addRange(ranges, context.range);

		for (const entity of context.entities) addRange(ranges, entity.range);
		for (const vo of context.valueObjects) addRange(ranges, vo.range);
		for (const cmd of context.commands) addRange(ranges, cmd.range);
		for (const query of context.queries) addRange(ranges, query.range);
		for (const function_ of context.functions)
			addRange(ranges, function_.range);
		for (const inv of context.invariants) addRange(ranges, inv.range);
		for (const sub of context.subscribers) addRange(ranges, sub.range);
		for (const port of context.ports) addRange(ranges, port.range);
		for (const error of context.errors) addRange(ranges, error.range);
		for (const type of context.types) addRange(ranges, type.range);
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
