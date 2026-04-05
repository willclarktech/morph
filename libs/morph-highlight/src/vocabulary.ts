// Aligned with TextMate grammar scopes from contexts/schema-dsl/impls/src/grammar.ts

export const DECLARATION_KEYWORDS = new Set([
	"alias",
	"command",
	"context",
	"contract",
	"domain",
	"entity",
	"error",
	"function",
	"invariant",
	"port",
	"query",
	"subscriber",
	"type",
	"union",
	"value",
]);

export const CLAUSE_KEYWORDS = new Set([
	"base",
	"by",
	"default",
	"depends",
	"emits",
	"errors",
	"input",
	"output",
	"post",
	"pre",
	"reads",
	"throws",
	"violation",
	"writes",
]);

export const CONTROL_KEYWORDS = new Set([
	"and",
	"contains",
	"count",
	"exists",
	"forall",
	"given",
	"if",
	"in",
	"not",
	"on",
	"or",
	"then",
	"when",
	"where",
]);

export const RELATIONSHIP_KEYWORDS = new Set([
	"belongs_to",
	"has_many",
	"has_one",
	"references",
]);

export const EXTENSION_KEYWORDS = new Set(["extensions", "profiles"]);

export const EXTENSION_TYPES = new Set([
	"auth",
	"encoding",
	"eventStore",
	"i18n",
	"sse",
	"storage",
]);

export const PRIMITIVE_TYPES = new Set([
	"boolean",
	"date",
	"datetime",
	"float",
	"integer",
	"string",
	"void",
]);

export const TAGS = new Set([
	"aggregate",
	"api",
	"cli",
	"cli-client",
	"cli_client",
	"context",
	"mcp",
	"root",
	"sensitive",
	"ui",
	"unique",
	"vscode",
]);
