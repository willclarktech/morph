import { LanguageSupport, StreamLanguage } from "@codemirror/language";

const KEYWORDS = new Set([
	"domain",
	"context",
	"entity",
	"value",
	"command",
	"query",
	"function",
	"subscriber",
	"invariant",
	"port",
	"contract",
	"extensions",
	"profiles",
	"type",
	"error",
	"input",
	"output",
	"reads",
	"writes",
	"emits",
	"errors",
	"on",
	"pre",
	"post",
	"where",
	"when",
	"violation",
	"default",
	"base",
	"belongs_to",
	"has_many",
]);

const TYPES = new Set([
	"string",
	"integer",
	"float",
	"boolean",
	"date",
	"datetime",
]);

const TAGS = new Set([
	"root",
	"cli",
	"api",
	"ui",
	"mcp",
	"vscode",
	"unique",
	"sensitive",
	"context",
	"aggregate",
	"cli-client",
	"cli_client",
]);

const morphStreamLanguage = StreamLanguage.define({
	token(stream) {
		if (stream.eatSpace()) return null;

		// Comments
		if (stream.match("//")) {
			stream.skipToEnd();
			return "comment";
		}

		// Strings
		if (stream.match('"')) {
			while (!stream.eol()) {
				if (stream.next() === '"') break;
			}
			return "string";
		}

		// Tags (@keyword)
		if (stream.match("@")) {
			stream.eatWhile(/[\w-]/);
			const tag = stream.current().slice(1);
			if (TAGS.has(tag)) return "keyword";
			return "meta";
		}

		// Numbers
		if (stream.match(/^-?\d+(\.\d+)?/)) {
			return "number";
		}

		// Identifiers and keywords
		if (stream.match(/^[\w_][\w_]*/)) {
			const word = stream.current();
			if (KEYWORDS.has(word)) return "keyword";
			if (TYPES.has(word)) return "typeName";
			if (word === "true" || word === "false") return "bool";
			return "variableName";
		}

		// Punctuation
		if (stream.match(/^[{}[\](),.:?|!<>=&+\-*/]/)) {
			return "punctuation";
		}

		stream.next();
		return null;
	},
});

export const morphLanguage = (): LanguageSupport =>
	new LanguageSupport(morphStreamLanguage);
