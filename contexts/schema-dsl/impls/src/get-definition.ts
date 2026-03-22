import type { DslLocation } from "@morph/schema-dsl-dsl";
import type {
	ContextAst,
	DomainAst,
	SourceRange,
} from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { parse } from "@morph/schema-dsl-parser";

export interface GetDefinitionHandler {
	readonly handle: (
		params: {
			readonly source: string;
			readonly line: number;
			readonly column: number;
		},
		options: Record<string, never>,
	) => Effect.Effect<DslLocation>;
}

export const GetDefinitionHandler = Context.GenericTag<GetDefinitionHandler>(
	"@morph/impls/GetDefinitionHandler",
);

const rangeToDto = (range: SourceRange) => ({
	startLine: range.start.line,
	startColumn: range.start.column,
	endLine: range.end.line,
	endColumn: range.end.column,
});

const emptyLocation: DslLocation = {
	range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
};

const getWordAtPosition = (
	source: string,
	line: number,
	column: number,
): string => {
	const lines = source.split("\n");
	const targetLine = lines[line - 1];
	if (!targetLine) return "";

	const col = column - 1;
	let start = col;
	let end = col;

	while (start > 0 && /\w/.test(targetLine[start - 1]!)) start--;
	while (end < targetLine.length && /\w/.test(targetLine[end]!)) end++;

	return targetLine.slice(start, end);
};

interface NamedDeclaration {
	readonly name: string;
	readonly range: SourceRange;
}

const collectDeclarations = (
	ast: DomainAst,
): ReadonlyMap<string, SourceRange> => {
	const declarations = new Map<string, SourceRange>();

	for (const ctx of ast.contexts) {
		declarations.set(ctx.name, ctx.range);
		addContextDeclarations(ctx, declarations);
	}

	return declarations;
};

const addContextDeclarations = (
	ctx: ContextAst,
	declarations: Map<string, SourceRange>,
): void => {
	const addAll = (items: readonly NamedDeclaration[]) => {
		for (const item of items) declarations.set(item.name, item.range);
	};

	addAll(ctx.entities);
	addAll(ctx.valueObjects);
	addAll(ctx.commands);
	addAll(ctx.queries);
	addAll(ctx.functions);
	addAll(ctx.invariants);
	addAll(ctx.subscribers);
	addAll(ctx.ports);
	addAll(ctx.errors);
	addAll(ctx.types);
};

export const GetDefinitionHandlerLive = Layer.succeed(GetDefinitionHandler, {
	handle: (params, _options) =>
		E.sync(() => {
			const parseResult = parse(params.source);
			if (!parseResult.ast) return emptyLocation;

			const word = getWordAtPosition(params.source, params.line, params.column);
			if (!word) return emptyLocation;

			const declarations = collectDeclarations(parseResult.ast);
			const range = declarations.get(word);
			if (!range) return emptyLocation;

			return { range: rangeToDto(range) };
		}),
});
