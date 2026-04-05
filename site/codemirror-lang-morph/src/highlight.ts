import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import {
	CLAUSE_KEYWORDS,
	CONTROL_KEYWORDS,
	DECLARATION_KEYWORDS,
	EXTENSION_KEYWORDS,
	EXTENSION_TYPES,
	PRIMITIVE_TYPES,
	RELATIONSHIP_KEYWORDS,
	TAGS,
} from "@morphdsl/morph-highlight";

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

		// Profile references (#name)
		if (stream.match("#")) {
			stream.eatWhile(/\w/);
			return "labelName";
		}

		// Numbers
		if (stream.match(/^-?\d+(?:\.\d+)?/)) {
			return "number";
		}

		// Identifiers and keywords
		if (stream.match(/^\w+/)) {
			const word = stream.current();
			if (word === "true" || word === "false") return "bool";
			if (DECLARATION_KEYWORDS.has(word)) return "keyword";
			if (CLAUSE_KEYWORDS.has(word)) return "keyword";
			if (CONTROL_KEYWORDS.has(word)) return "keyword";
			if (RELATIONSHIP_KEYWORDS.has(word)) return "keyword";
			if (EXTENSION_KEYWORDS.has(word)) return "keyword";
			if (EXTENSION_TYPES.has(word)) return "keyword";
			if (PRIMITIVE_TYPES.has(word)) return "typeName";
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
