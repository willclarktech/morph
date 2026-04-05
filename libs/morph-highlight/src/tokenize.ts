import {
	CLAUSE_KEYWORDS,
	CONTROL_KEYWORDS,
	DECLARATION_KEYWORDS,
	EXTENSION_KEYWORDS,
	EXTENSION_TYPES,
	PRIMITIVE_TYPES,
	RELATIONSHIP_KEYWORDS,
	TAGS,
} from "./vocabulary";

export type Scope =
	| "comment"
	| "string"
	| "number"
	| "boolean"
	| "keyword"
	| "keyword.clause"
	| "keyword.control"
	| "keyword.relationship"
	| "keyword.extension"
	| "type.primitive"
	| "type.extension"
	| "type.reference"
	| "tag"
	| "label"
	| "punctuation"
	| "operator"
	| "variable"
	| "plain";

export interface Token {
	readonly scope: Scope;
	readonly text: string;
}

const OPERATOR_RE = /^(?:==|!=|&&|\|\||>=|<=|=>|\.\.)/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?/;
const WORD_RE = /^\w+/;
const PUNCTUATION_RE = /^[{}[\](),.:?|!<>=&+\-*/]/;

export const tokenize = (code: string): Token[] => {
	const tokens: Token[] = [];
	const lines = code.split("\n");

	for (const [li, line] of lines.entries()) {
		if (li > 0) tokens.push({ scope: "plain", text: "\n" });
		let pos = 0;

		while (pos < line.length) {
			// Whitespace
			const wsMatch = /^[ \t]+/.exec(line.slice(pos));
			if (wsMatch) {
				tokens.push({ scope: "plain", text: wsMatch[0] });
				pos += wsMatch[0].length;
				continue;
			}

			// Comments
			if (line.slice(pos, pos + 2) === "//") {
				tokens.push({ scope: "comment", text: line.slice(pos) });
				pos = line.length;
				continue;
			}

			// Strings
			if (line[pos] === '"') {
				let end = pos + 1;
				while (end < line.length && line[end] !== '"') {
					if (line[end] === "\\") end++;
					end++;
				}
				if (end < line.length) end++; // include closing quote
				tokens.push({ scope: "string", text: line.slice(pos, end) });
				pos = end;
				continue;
			}

			// Tags (@keyword)
			if (line[pos] === "@") {
				const rest = line.slice(pos + 1);
				const tagMatch = /^\w[\w-]*/.exec(rest);
				if (tagMatch) {
					const full = "@" + tagMatch[0];
					const tagName = tagMatch[0];
					tokens.push({
						scope: TAGS.has(tagName) ? "tag" : "tag",
						text: full,
					});
					pos += full.length;
					continue;
				}
				tokens.push({ scope: "punctuation", text: "@" });
				pos++;
				continue;
			}

			// Profile references (#name)
			if (line[pos] === "#") {
				const rest = line.slice(pos + 1);
				const labelMatch = /^\w+/.exec(rest);
				if (labelMatch) {
					const full = "#" + labelMatch[0];
					tokens.push({ scope: "label", text: full });
					pos += full.length;
					continue;
				}
				tokens.push({ scope: "punctuation", text: "#" });
				pos++;
				continue;
			}

			// Operators (multi-char, check before punctuation)
			const opMatch = OPERATOR_RE.exec(line.slice(pos));
			if (opMatch) {
				tokens.push({ scope: "operator", text: opMatch[0] });
				pos += opMatch[0].length;
				continue;
			}

			// Numbers
			const numberMatch = NUMBER_RE.exec(line.slice(pos));
			if (numberMatch && (pos === 0 || !/\w/.test(line[pos - 1] ?? ""))) {
				tokens.push({ scope: "number", text: numberMatch[0] });
				pos += numberMatch[0].length;
				continue;
			}

			// Words (identifiers, keywords, types)
			const wordMatch = WORD_RE.exec(line.slice(pos));
			if (wordMatch) {
				const word = wordMatch[0];
				const scope = classifyWord(word);
				tokens.push({ scope, text: word });
				pos += word.length;
				continue;
			}

			// Punctuation
			const punctMatch = PUNCTUATION_RE.exec(line.slice(pos));
			if (punctMatch) {
				tokens.push({ scope: "punctuation", text: punctMatch[0] });
				pos += punctMatch[0].length;
				continue;
			}

			// Fallback — single character
			tokens.push({ scope: "plain", text: line[pos] ?? "" });
			pos++;
		}
	}

	return tokens;
};

const classifyWord = (word: string): Scope => {
	if (word === "true" || word === "false") return "boolean";
	if (DECLARATION_KEYWORDS.has(word)) return "keyword";
	if (CLAUSE_KEYWORDS.has(word)) return "keyword.clause";
	if (CONTROL_KEYWORDS.has(word)) return "keyword.control";
	if (RELATIONSHIP_KEYWORDS.has(word)) return "keyword.relationship";
	if (EXTENSION_KEYWORDS.has(word)) return "keyword.extension";
	if (PRIMITIVE_TYPES.has(word)) return "type.primitive";
	if (EXTENSION_TYPES.has(word)) return "type.extension";
	if (/^[A-Z]/.test(word)) return "type.reference";
	return "variable";
};
