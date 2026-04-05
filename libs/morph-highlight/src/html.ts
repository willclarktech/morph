import { tokenize } from "./tokenize";
import type { Scope } from "./tokenize";

const escapeHtml = (s: string): string =>
	s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const SCOPE_TO_CLASS: Record<Scope, string | undefined> = {
	comment: "hl-comment",
	string: "hl-string",
	number: "hl-number",
	boolean: "hl-boolean",
	keyword: "hl-keyword",
	"keyword.clause": "hl-keyword-clause",
	"keyword.control": "hl-keyword-control",
	"keyword.relationship": "hl-keyword-relationship",
	"keyword.extension": "hl-keyword-extension",
	"type.primitive": "hl-type-primitive",
	"type.extension": "hl-type-extension",
	"type.reference": "hl-type-reference",
	tag: "hl-tag",
	label: "hl-label",
	punctuation: "hl-punctuation",
	operator: "hl-operator",
	variable: undefined,
	plain: undefined,
};

export const highlightMorph = (code: string): string => {
	const tokens = tokenize(code);
	let html = "";
	for (const token of tokens) {
		const escaped = escapeHtml(token.text);
		const cls = SCOPE_TO_CLASS[token.scope];
		html += cls ? `<span class="${cls}">${escaped}</span>` : escaped;
	}
	return html;
};
