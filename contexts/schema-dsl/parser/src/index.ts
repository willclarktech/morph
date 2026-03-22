import type { DomainAst, ParseError } from "./ast";

import { morphLexer } from "./lexer";
import { morphParser } from "./parser";
import { morphVisitor } from "./visitor";

export * from "./ast";

export interface ParseResult {
	readonly ast?: DomainAst;
	readonly errors: readonly ParseError[];
}

export const parse = (source: string): ParseResult => {
	const lexResult = morphLexer.tokenize(source);
	const errors: ParseError[] = [];

	for (const lexError of lexResult.errors) {
		errors.push({
			message: lexError.message,
			range: {
				start: {
					line: lexError.line ?? 0,
					column: lexError.column ?? 0,
					offset: lexError.offset,
				},
				end: {
					line: lexError.line ?? 0,
					column: (lexError.column ?? 0) + lexError.length,
					offset: lexError.offset + lexError.length,
				},
			},
			severity: "error",
		});
	}

	morphParser.input = lexResult.tokens;
	const cst = morphParser.domain();

	for (const parseError of morphParser.errors) {
		const token = parseError.token;
		errors.push({
			message: parseError.message,
			range: {
				start: {
					line: token.startLine ?? 0,
					column: token.startColumn ?? 0,
					offset: token.startOffset,
				},
				end: {
					line: token.endLine ?? 0,
					column: (token.endColumn ?? 0) + 1,
					offset: (token.endOffset ?? 0) + 1,
				},
			},
			severity: "error",
		});
	}

	if (errors.length > 0) {
		return { errors };
	}

	const ast = morphVisitor.visit(cst) as DomainAst;
	return { ast, errors: [] };
};
