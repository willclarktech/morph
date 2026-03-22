import type { DslHoverResult } from "@morph/schema-dsl-dsl";
import type {
	CommandAst,
	ContextAst,
	DomainAst,
	EntityAst,
	FunctionDeclAst,
	QueryAst,
	SourceRange,
	ValueObjectAst,
} from "@morph/schema-dsl-parser";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import { parse } from "@morph/schema-dsl-parser";

export interface GetHoverHandler {
	readonly handle: (
		params: {
			readonly source: string;
			readonly line: number;
			readonly column: number;
		},
		options: Record<string, never>,
	) => Effect.Effect<DslHoverResult>;
}

export const GetHoverHandler = Context.GenericTag<GetHoverHandler>(
	"@morph/impls/GetHoverHandler",
);

const rangeToDto = (range: SourceRange) => ({
	startLine: range.start.line,
	startColumn: range.start.column,
	endLine: range.end.line,
	endColumn: range.end.column,
});

const positionInRange = (
	line: number,
	column: number,
	range: SourceRange,
): boolean => {
	if (line < range.start.line || line > range.end.line) return false;
	if (line === range.start.line && column < range.start.column) return false;
	if (line === range.end.line && column > range.end.column) return false;
	return true;
};

const entityHover = (entity: EntityAst): string => {
	const lines = [`**entity** \`${entity.name}\``];
	if (entity.description) lines.push(entity.description);
	lines.push(`\n${entity.attributes.length} attribute(s)`);
	if (entity.relationships.length > 0) {
		lines.push(`${entity.relationships.length} relationship(s)`);
	}
	return lines.join("\n\n");
};

const valueObjectHover = (vo: ValueObjectAst): string => {
	const lines = [`**value** \`${vo.name}\``];
	if (vo.description) lines.push(vo.description);
	lines.push(`\n${vo.attributes.length} field(s)`);
	return lines.join("\n\n");
};

const commandHover = (cmd: CommandAst): string => {
	const lines = [`**command** \`${cmd.name}\``];
	if (cmd.description) lines.push(cmd.description);
	if (cmd.input.length > 0)
		lines.push(`Input: ${cmd.input.map((p) => p.name).join(", ")}`);
	if (cmd.emits.length > 0)
		lines.push(`Emits: ${cmd.emits.map((e) => e.name).join(", ")}`);
	return lines.join("\n\n");
};

const queryHover = (query: QueryAst): string => {
	const lines = [`**query** \`${query.name}\``];
	if (query.description) lines.push(query.description);
	if (query.input.length > 0)
		lines.push(`Input: ${query.input.map((p) => p.name).join(", ")}`);
	return lines.join("\n\n");
};

const functionHover = (fn: FunctionDeclAst): string => {
	const lines = [`**function** \`${fn.name}\``];
	if (fn.description) lines.push(fn.description);
	if (fn.input.length > 0)
		lines.push(`Input: ${fn.input.map((p) => p.name).join(", ")}`);
	return lines.join("\n\n");
};

const findHoverInContext = (
	ctx: ContextAst,
	line: number,
	column: number,
): DslHoverResult | undefined => {
	for (const entity of ctx.entities) {
		if (positionInRange(line, column, entity.range)) {
			return { content: entityHover(entity), range: rangeToDto(entity.range) };
		}
	}
	for (const vo of ctx.valueObjects) {
		if (positionInRange(line, column, vo.range)) {
			return { content: valueObjectHover(vo), range: rangeToDto(vo.range) };
		}
	}
	for (const cmd of ctx.commands) {
		if (positionInRange(line, column, cmd.range)) {
			return { content: commandHover(cmd), range: rangeToDto(cmd.range) };
		}
	}
	for (const query of ctx.queries) {
		if (positionInRange(line, column, query.range)) {
			return { content: queryHover(query), range: rangeToDto(query.range) };
		}
	}
	for (const fn of ctx.functions) {
		if (positionInRange(line, column, fn.range)) {
			return { content: functionHover(fn), range: rangeToDto(fn.range) };
		}
	}
	for (const inv of ctx.invariants) {
		if (positionInRange(line, column, inv.range)) {
			const lines = [`**invariant** \`${inv.name}\``];
			if (inv.description) lines.push(inv.description);
			return { content: lines.join("\n\n"), range: rangeToDto(inv.range) };
		}
	}
	return undefined;
};

const findHoverInAst = (
	ast: DomainAst,
	line: number,
	column: number,
): DslHoverResult | undefined => {
	for (const ctx of ast.contexts) {
		if (positionInRange(line, column, ctx.range)) {
			const inner = findHoverInContext(ctx, line, column);
			if (inner) return inner;
			const description = ctx.description
				? `**context** \`${ctx.name}\`\n\n${ctx.description}`
				: `**context** \`${ctx.name}\``;
			return { content: description, range: rangeToDto(ctx.range) };
		}
	}

	if (ast.extensions && positionInRange(line, column, ast.extensions.range)) {
		return {
			content: "**extensions** — Global configuration (storage, auth, etc.)",
			range: rangeToDto(ast.extensions.range),
		};
	}

	return undefined;
};

export const GetHoverHandlerLive = Layer.succeed(GetHoverHandler, {
	handle: (params, _options) =>
		E.sync(() => {
			const parseResult = parse(params.source);
			if (!parseResult.ast) return { content: "" };
			return (
				findHoverInAst(parseResult.ast, params.line, params.column) ?? {
					content: "",
				}
			);
		}),
});
