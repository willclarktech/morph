import {
	DECLARATION_KEYWORDS,
	CLAUSE_KEYWORDS,
	CONTROL_KEYWORDS,
	RELATIONSHIP_KEYWORDS,
	EXTENSION_KEYWORDS,
	EXTENSION_TYPES,
	PRIMITIVE_TYPES,
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
const WORD_RE = /^[\w][\w]*/;
const PUNCTUATION_RE = /^[{}[\](),.:?|!<>=&+\-*/]/;

export const tokenize = (code: string): Token[] => {
	const tokens: Token[] = [];
	const lines = code.split("\n");

	for (let li = 0; li < lines.length; li++) {
		if (li > 0) tokens.push({ scope: "plain", text: "\n" });
		const line = lines[li];
		let pos = 0;

		while (pos < line.length) {
			// Whitespace
			const wsMatch = line.slice(pos).match(/^[ \t]+/);
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
				const tagMatch = rest.match(/^[\w][\w-]*/);
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
				const labelMatch = rest.match(/^[\w]+/);
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
			const opMatch = line.slice(pos).match(OPERATOR_RE);
			if (opMatch) {
				tokens.push({ scope: "operator", text: opMatch[0] });
				pos += opMatch[0].length;
				continue;
			}

			// Numbers
			const numMatch = line.slice(pos).match(NUMBER_RE);
			if (numMatch && (pos === 0 || !/[\w]/.test(line[pos - 1]))) {
				tokens.push({ scope: "number", text: numMatch[0] });
				pos += numMatch[0].length;
				continue;
			}

			// Words (identifiers, keywords, types)
			const wordMatch = line.slice(pos).match(WORD_RE);
			if (wordMatch) {
				const word = wordMatch[0];
				const scope = classifyWord(word);
				tokens.push({ scope, text: word });
				pos += word.length;
				continue;
			}

			// Punctuation
			const punctMatch = line.slice(pos).match(PUNCTUATION_RE);
			if (punctMatch) {
				tokens.push({ scope: "punctuation", text: punctMatch[0] });
				pos += punctMatch[0].length;
				continue;
			}

			// Fallback — single character
			tokens.push({ scope: "plain", text: line[pos] });
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
