import type { CstNode, IToken } from "chevrotain";

import type { SourceRange } from "./ast";

export const rangeFromToken = (token: IToken): SourceRange => ({
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
});

export const rangeFromTokens = (first: IToken, last: IToken): SourceRange => ({
	start: {
		line: first.startLine ?? 0,
		column: first.startColumn ?? 0,
		offset: first.startOffset,
	},
	end: {
		line: last.endLine ?? 0,
		column: (last.endColumn ?? 0) + 1,
		offset: (last.endOffset ?? 0) + 1,
	},
});

export const stripQuotes = (s: string): string => s.slice(1, -1);

export const tokenImage = (token: IToken): string => token.image;

export const findFirstToken = (node: CstNode | IToken): IToken => {
	if ("image" in node) return node;
	const cst = node;
	let earliest: IToken | undefined;
	for (const children of Object.values(cst.children)) {
		for (const child of children) {
			const token = findFirstToken(child);
			if (!earliest || token.startOffset < earliest.startOffset) {
				earliest = token;
			}
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- non-empty CST always has tokens
	return earliest!;
};

export const findLastToken = (node: CstNode | IToken): IToken => {
	if ("image" in node) return node;
	const cst = node;
	let latest: IToken | undefined;
	for (const children of Object.values(cst.children)) {
		for (const child of children) {
			const token = findLastToken(child);
			if (!latest || (token.endOffset ?? 0) > (latest.endOffset ?? 0)) {
				latest = token;
			}
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- non-empty CST always has tokens
	return latest!;
};
