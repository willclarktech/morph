import type { DslSymbol } from "@morph/schema-dsl-dsl";
import type {
	ContextAst,
	DomainAst,
	SourceRange,
} from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { parse } from "@morph/schema-dsl-parser";

export interface GetSymbolsHandler {
	readonly handle: (
		params: { readonly source: string },
		options: Record<string, never>,
	) => Effect.Effect<readonly DslSymbol[]>;
}

export const GetSymbolsHandler = Context.GenericTag<GetSymbolsHandler>(
	"@morph/impls/GetSymbolsHandler",
);

const rangeToDto = (range: SourceRange) => ({
	startLine: range.start.line,
	startColumn: range.start.column,
	endLine: range.end.line,
	endColumn: range.end.column,
});

const buildContextSymbols = (ctx: ContextAst): DslSymbol => {
	const children: DslSymbol[] = [];

	for (const entity of ctx.entities) {
		const entityChildren: DslSymbol[] = entity.attributes.map((attr) => ({
			name: attr.name,
			kind: "attribute",
			range: rangeToDto(attr.range),
			children: [],
		}));
		children.push({
			name: entity.name,
			kind: "entity",
			range: rangeToDto(entity.range),
			children: entityChildren,
		});
	}

	for (const vo of ctx.valueObjects) {
		children.push({
			name: vo.name,
			kind: "value",
			range: rangeToDto(vo.range),
			children: vo.attributes.map((attr) => ({
				name: attr.name,
				kind: "attribute",
				range: rangeToDto(attr.range),
				children: [],
			})),
		});
	}

	for (const cmd of ctx.commands) {
		children.push({
			name: cmd.name,
			kind: "command",
			range: rangeToDto(cmd.range),
			children: [],
		});
	}

	for (const query of ctx.queries) {
		children.push({
			name: query.name,
			kind: "query",
			range: rangeToDto(query.range),
			children: [],
		});
	}

	for (const fn of ctx.functions) {
		children.push({
			name: fn.name,
			kind: "function",
			range: rangeToDto(fn.range),
			children: [],
		});
	}

	for (const inv of ctx.invariants) {
		children.push({
			name: inv.name,
			kind: "invariant",
			range: rangeToDto(inv.range),
			children: [],
		});
	}

	for (const sub of ctx.subscribers) {
		children.push({
			name: sub.name,
			kind: "subscriber",
			range: rangeToDto(sub.range),
			children: [],
		});
	}

	for (const port of ctx.ports) {
		children.push({
			name: port.name,
			kind: "port",
			range: rangeToDto(port.range),
			children: [],
		});
	}

	for (const err of ctx.errors) {
		children.push({
			name: err.name,
			kind: "error",
			range: rangeToDto(err.range),
			children: [],
		});
	}

	for (const type of ctx.types) {
		children.push({
			name: type.name,
			kind: "type",
			range: rangeToDto(type.range),
			children: [],
		});
	}

	return {
		name: ctx.name,
		kind: "context",
		range: rangeToDto(ctx.range),
		children,
	};
};

const buildDomainSymbols = (ast: DomainAst): DslSymbol[] => {
	const children: DslSymbol[] = [];

	if (ast.extensions) {
		children.push({
			name: "extensions",
			kind: "extensions",
			range: rangeToDto(ast.extensions.range),
			children: [],
		});
	}

	for (const ctx of ast.contexts) {
		children.push(buildContextSymbols(ctx));
	}

	return [
		{
			name: ast.name,
			kind: "domain",
			range: rangeToDto(ast.range),
			children,
		},
	];
};

export const GetSymbolsHandlerLive = Layer.succeed(GetSymbolsHandler, {
	handle: (params, _options) =>
		E.sync(() => {
			const parseResult = parse(params.source);
			if (!parseResult.ast) return [];
			return buildDomainSymbols(parseResult.ast);
		}),
});
