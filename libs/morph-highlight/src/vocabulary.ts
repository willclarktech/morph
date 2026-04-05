// Aligned with TextMate grammar scopes from contexts/schema-dsl/impls/src/grammar.ts

export const DECLARATION_KEYWORDS = new Set([
	"domain",
	"context",
	"entity",
	"value",
	"command",
	"query",
	"function",
	"invariant",
	"subscriber",
	"port",
	"type",
	"union",
	"alias",
	"error",
	"contract",
]);

export const CLAUSE_KEYWORDS = new Set([
	"input",
	"output",
	"reads",
	"writes",
	"emits",
	"errors",
	"pre",
	"post",
	"throws",
	"violation",
	"depends",
	"default",
	"base",
	"by",
]);

export const CONTROL_KEYWORDS = new Set([
	"if",
	"then",
	"where",
	"when",
	"on",
	"in",
	"forall",
	"exists",
	"contains",
	"count",
	"given",
	"and",
	"or",
	"not",
]);

export const RELATIONSHIP_KEYWORDS = new Set([
	"belongs_to",
	"has_many",
	"has_one",
	"references",
]);

export const EXTENSION_KEYWORDS = new Set(["extensions", "profiles"]);

export const EXTENSION_TYPES = new Set([
	"storage",
	"auth",
	"eventStore",
	"sse",
	"i18n",
	"encoding",
]);

export const PRIMITIVE_TYPES = new Set([
	"string",
	"integer",
	"float",
	"boolean",
	"date",
	"datetime",
	"void",
]);

export const TAGS = new Set([
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
