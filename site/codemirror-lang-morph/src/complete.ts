import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";

import { autocompletion } from "@codemirror/autocomplete";

const KEYWORD_COMPLETIONS = [
	"domain", "context", "entity", "value", "command", "query",
	"function", "subscriber", "invariant", "port", "contract",
	"extensions", "type", "error", "input", "output",
	"reads", "writes", "emits", "errors", "on", "pre", "post",
	"where", "when", "violation", "default", "belongs_to", "has_many",
].map((label) => ({ label, type: "keyword" }));

const TYPE_COMPLETIONS = [
	"string", "integer", "float", "boolean", "date", "datetime",
].map((label) => ({ label, type: "type" }));

const TAG_COMPLETIONS = [
	"root", "cli", "api", "ui", "mcp", "vscode", "unique",
	"sensitive", "context", "aggregate",
].map((label) => ({ label: `@${label}`, type: "keyword" }));

const morphCompletionSource = (context: CompletionContext): CompletionResult | null => {
	const word = context.matchBefore(/[\w@][\w-]*/);
	if (!word && !context.explicit) return null;

	const from = word?.from ?? context.pos;
	const text = word?.text ?? "";

	if (text.startsWith("@")) {
		return {
			from,
			options: TAG_COMPLETIONS.filter((c) =>
				c.label.toLowerCase().startsWith(text.toLowerCase()),
			),
		};
	}

	return {
		from,
		options: [...KEYWORD_COMPLETIONS, ...TYPE_COMPLETIONS].filter((c) =>
			c.label.toLowerCase().startsWith(text.toLowerCase()),
		),
	};
};

export const morphCompletion = (): Extension =>
	autocompletion({ override: [morphCompletionSource] });
