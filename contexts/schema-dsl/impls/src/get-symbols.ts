import type { DslSymbol } from "@morph/schema-dsl-dsl";
import type {
	ContextAst,
	DomainAst,
	SourceRange,
} from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { parse } from "@morph/schema-dsl-parser";
import { Context, Effect as E, Layer } from "effect";

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

const buildContextSymbols = (context: ContextAst): DslSymbol => {
	const children: DslSymbol[] = [];

	for (const entity of context.entities) {
		const entityChildren: DslSymbol[] = entity.attributes.map((attribute) => ({
			name: attribute.name,
			kind: "attribute",
			range: rangeToDto(attribute.range),
			children: [],
		}));
		children.push({
			name: entity.name,
			kind: "entity",
			range: rangeToDto(entity.range),
			children: entityChildren,
		});
	}

	for (const vo of context.valueObjects) {
		children.push({
			name: vo.name,
			kind: "value",
			range: rangeToDto(vo.range),
			children: vo.attributes.map((attribute) => ({
				name: attribute.name,
				kind: "attribute",
				range: rangeToDto(attribute.range),
				children: [],
			})),
		});
	}

	for (const cmd of context.commands) {
		children.push({
			name: cmd.name,
			kind: "command",
			range: rangeToDto(cmd.range),
			children: [],
		});
	}

	for (const query of context.queries) {
		children.push({
			name: query.name,
			kind: "query",
			range: rangeToDto(query.range),
			children: [],
		});
	}

	for (const function_ of context.functions) {
		children.push({
			name: function_.name,
			kind: "function",
			range: rangeToDto(function_.range),
			children: [],
		});
	}

	for (const inv of context.invariants) {
		children.push({
			name: inv.name,
			kind: "invariant",
			range: rangeToDto(inv.range),
			children: [],
		});
	}

	for (const sub of context.subscribers) {
		children.push({
			name: sub.name,
			kind: "subscriber",
			range: rangeToDto(sub.range),
			children: [],
		});
	}

	for (const port of context.ports) {
		children.push({
			name: port.name,
			kind: "port",
			range: rangeToDto(port.range),
			children: [],
		});
	}

	for (const error of context.errors) {
		children.push({
			name: error.name,
			kind: "error",
			range: rangeToDto(error.range),
			children: [],
		});
	}

	for (const type of context.types) {
		children.push({
			name: type.name,
			kind: "type",
			range: rangeToDto(type.range),
			children: [],
		});
	}

	return {
		name: context.name,
		kind: "context",
		range: rangeToDto(context.range),
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

	for (const context of ast.contexts) {
		children.push(buildContextSymbols(context));
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
