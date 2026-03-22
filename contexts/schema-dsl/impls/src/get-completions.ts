import type { DslCompletion } from "@morph/schema-dsl-dsl";
import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

import type {
	ContextAst,
	DomainAst,
	SourceRange,
} from "@morph/schema-dsl-parser";
import { parse } from "@morph/schema-dsl-parser";

export interface GetCompletionsHandler {
	readonly handle: (
		params: {
			readonly source: string;
			readonly line: number;
			readonly column: number;
		},
		options: Record<string, never>,
	) => Effect.Effect<readonly DslCompletion[]>;
}

export const GetCompletionsHandler = Context.GenericTag<GetCompletionsHandler>(
	"@morph/impls/GetCompletionsHandler",
);

// ── Completion Data ──────────────────────────────────────────────────────

const DECLARATION_KEYWORDS: readonly DslCompletion[] = [
	{ label: "entity", kind: "keyword", detail: "Define an aggregate entity" },
	{ label: "value", kind: "keyword", detail: "Define a value object" },
	{ label: "command", kind: "keyword", detail: "Define a write operation" },
	{ label: "query", kind: "keyword", detail: "Define a read operation" },
	{ label: "function", kind: "keyword", detail: "Define a pure function" },
	{ label: "invariant", kind: "keyword", detail: "Define a business rule" },
	{
		label: "subscriber",
		kind: "keyword",
		detail: "Define an event subscriber",
	},
	{
		label: "port",
		kind: "keyword",
		detail: "Define an external service port",
	},
	{ label: "error", kind: "keyword", detail: "Define a context error" },
	{ label: "type", kind: "keyword", detail: "Define a product type" },
	{ label: "union", kind: "keyword", detail: "Define a sum type" },
	{ label: "alias", kind: "keyword", detail: "Define a type alias" },
	{
		label: "contract",
		kind: "keyword",
		detail: "Define a contract (property test)",
	},
	{
		label: "depends",
		kind: "keyword",
		detail: "Declare context dependency",
	},
];

const OPERATION_CLAUSE_KEYWORDS: readonly DslCompletion[] = [
	{ label: "input", kind: "keyword", detail: "Define input parameters" },
	{ label: "output", kind: "keyword", detail: "Define output type" },
	{ label: "reads", kind: "keyword", detail: "Declare read access" },
	{ label: "writes", kind: "keyword", detail: "Declare write access" },
	{ label: "emits", kind: "keyword", detail: "Declare emitted events" },
	{ label: "errors", kind: "keyword", detail: "Declare possible errors" },
	{ label: "pre", kind: "keyword", detail: "Declare precondition" },
	{ label: "post", kind: "keyword", detail: "Declare postcondition" },
];

const PRIMITIVE_TYPES: readonly DslCompletion[] = [
	{ label: "string", kind: "type", detail: "String primitive" },
	{ label: "float", kind: "type", detail: "Floating-point number" },
	{ label: "integer", kind: "type", detail: "64-bit integer (bigint)" },
	{ label: "boolean", kind: "type", detail: "Boolean primitive" },
	{ label: "date", kind: "type", detail: "Date (ISO 8601, date only)" },
	{ label: "datetime", kind: "type", detail: "Date and time (ISO 8601)" },
	{ label: "void", kind: "type", detail: "Void type" },
];

const KNOWN_TAGS: readonly DslCompletion[] = [
	{ label: "@api", kind: "tag", detail: "REST API endpoint" },
	{ label: "@cli", kind: "tag", detail: "CLI command" },
	{ label: "@cli_client", kind: "tag", detail: "CLI client command" },
	{ label: "@mcp", kind: "tag", detail: "MCP tool" },
	{ label: "@vscode", kind: "tag", detail: "VSCode extension" },
	{ label: "@ui", kind: "tag", detail: "UI operation" },
	{ label: "@root", kind: "tag", detail: "Aggregate root entity" },
	{ label: "@sensitive", kind: "tag", detail: "Mark as sensitive" },
	{ label: "@unique", kind: "tag", detail: "Unique constraint" },
	{ label: "@context", kind: "tag", detail: "Context-scoped invariant" },
];

const TOP_LEVEL_KEYWORDS: readonly DslCompletion[] = [
	{ label: "domain", kind: "keyword", detail: "Define the domain" },
	{ label: "context", kind: "keyword", detail: "Define a bounded context" },
	{
		label: "extensions",
		kind: "keyword",
		detail: "Define extensions (storage, auth, etc.)",
	},
];

const EXTENSION_TYPES: readonly DslCompletion[] = [
	{
		label: "storage",
		kind: "keyword",
		detail: "Storage backends (memory, jsonfile, sqlite, redis)",
	},
	{
		label: "auth",
		kind: "keyword",
		detail: "Auth providers (none, jwt, session, apikey, password)",
	},
	{
		label: "eventStore",
		kind: "keyword",
		detail: "Event store backends (memory, jsonfile, redis)",
	},
	{
		label: "i18n",
		kind: "keyword",
		detail: "Internationalization languages",
	},
];

const RELATIONSHIP_KEYWORDS: readonly DslCompletion[] = [
	{
		label: "belongs_to",
		kind: "keyword",
		detail: "Many-to-one relationship",
	},
	{
		label: "has_many",
		kind: "keyword",
		detail: "One-to-many relationship",
	},
	{ label: "has_one", kind: "keyword", detail: "One-to-one relationship" },
	{
		label: "references",
		kind: "keyword",
		detail: "Reference relationship",
	},
];

const INVARIANT_CLAUSE_KEYWORDS: readonly DslCompletion[] = [
	{ label: "violation", kind: "keyword", detail: "Violation message" },
	{ label: "where", kind: "keyword", detail: "Condition expression" },
	{ label: "on", kind: "keyword", detail: "Scope to entity" },
];

const SUBSCRIBER_CLAUSE_KEYWORDS: readonly DslCompletion[] = [
	{ label: "on", kind: "keyword", detail: "Events to listen for" },
];

// ── AST Context Detection ────────────────────────────────────────────────

type CursorContext =
	| "top-level"
	| "extensions-body"
	| "context-body"
	| "entity-body"
	| "value-body"
	| "operation-body"
	| "function-body"
	| "invariant-body"
	| "subscriber-body"
	| "port-body"
	| "type-body"
	| "union-body"
	| "error-body"
	| "input-body"
	| "errors-body";

const containsCursor = (range: SourceRange, line: number, col: number) => {
	const l = line - 1;
	const c = col - 1;
	if (l < range.start.line || l > range.end.line) return false;
	if (l === range.start.line && c < range.start.column) return false;
	if (l === range.end.line && c > range.end.column) return false;
	return true;
};

const detectContext = (
	ast: DomainAst,
	line: number,
	col: number,
): { context: CursorContext; astContext?: ContextAst } => {
	for (const ctx of ast.contexts) {
		if (!containsCursor(ctx.range, line, col)) continue;

		for (const entity of ctx.entities) {
			if (containsCursor(entity.range, line, col)) {
				return { context: "entity-body", astContext: ctx };
			}
		}
		for (const vo of ctx.valueObjects) {
			if (containsCursor(vo.range, line, col)) {
				return { context: "value-body", astContext: ctx };
			}
		}
		for (const cmd of ctx.commands) {
			if (containsCursor(cmd.range, line, col)) {
				return { context: "operation-body", astContext: ctx };
			}
		}
		for (const q of ctx.queries) {
			if (containsCursor(q.range, line, col)) {
				return { context: "operation-body", astContext: ctx };
			}
		}
		for (const fn of ctx.functions) {
			if (containsCursor(fn.range, line, col)) {
				return { context: "function-body", astContext: ctx };
			}
		}
		for (const inv of ctx.invariants) {
			if (containsCursor(inv.range, line, col)) {
				return { context: "invariant-body", astContext: ctx };
			}
		}
		for (const sub of ctx.subscribers) {
			if (containsCursor(sub.range, line, col)) {
				return { context: "subscriber-body", astContext: ctx };
			}
		}
		for (const port of ctx.ports) {
			if (containsCursor(port.range, line, col)) {
				return { context: "port-body", astContext: ctx };
			}
		}
		for (const type of ctx.types) {
			if (containsCursor(type.range, line, col)) {
				if (type.kind === "sum") {
					return { context: "union-body", astContext: ctx };
				}
				return { context: "type-body", astContext: ctx };
			}
		}
		for (const err of ctx.errors) {
			if (containsCursor(err.range, line, col)) {
				return { context: "error-body", astContext: ctx };
			}
		}
		for (const contract of ctx.contracts) {
			if (containsCursor(contract.range, line, col)) {
				return { context: "operation-body", astContext: ctx };
			}
		}

		return { context: "context-body", astContext: ctx };
	}

	if (ast.extensions && containsCursor(ast.extensions.range, line, col)) {
		return { context: "extensions-body" };
	}

	return { context: "top-level" };
};

// ── Collect Names from AST ───────────────────────────────────────────────

const collectTypeNames = (ast: DomainAst): DslCompletion[] => {
	const completions: DslCompletion[] = [];
	for (const ctx of ast.contexts) {
		for (const entity of ctx.entities) {
			completions.push({
				label: entity.name,
				kind: "entity",
				detail: entity.description ?? "Entity",
			});
		}
		for (const vo of ctx.valueObjects) {
			completions.push({
				label: vo.name,
				kind: "type",
				detail: vo.description ?? "Value object",
			});
		}
		for (const type of ctx.types) {
			completions.push({
				label: type.name,
				kind: "type",
				detail: type.description ?? "Type",
			});
		}
	}
	return completions;
};

const collectEntityNames = (ast: DomainAst): DslCompletion[] => {
	const completions: DslCompletion[] = [];
	for (const ctx of ast.contexts) {
		for (const entity of ctx.entities) {
			completions.push({
				label: entity.name,
				kind: "entity",
				detail: entity.description ?? "Entity",
			});
		}
	}
	return completions;
};

const collectEventNames = (ast: DomainAst): DslCompletion[] => {
	const completions: DslCompletion[] = [];
	for (const ctx of ast.contexts) {
		for (const cmd of ctx.commands) {
			for (const event of cmd.emits) {
				completions.push({
					label: event.name,
					kind: "entity",
					detail: event.description ?? "Event",
				});
			}
		}
	}
	return completions;
};

const collectInvariantNames = (ctx: ContextAst): DslCompletion[] =>
	ctx.invariants.map((inv) => ({
		label: inv.name,
		kind: "entity",
		detail: inv.description ?? "Invariant",
	}));

const collectPortNames = (ctx: ContextAst): DslCompletion[] =>
	ctx.ports.map((port) => ({
		label: port.name,
		kind: "entity",
		detail: port.description ?? "Port",
	}));

// ── Line Prefix Helpers ──────────────────────────────────────────────────

const getLinePrefix = (
	source: string,
	line: number,
	column: number,
): string => {
	const lines = source.split("\n");
	const targetLine = lines[line - 1];
	if (!targetLine) return "";
	return targetLine.slice(0, column - 1);
};

// ── Handler ──────────────────────────────────────────────────────────────

export const GetCompletionsHandlerLive = Layer.succeed(GetCompletionsHandler, {
	handle: (params, _options) =>
		E.sync(() => {
			const prefix = getLinePrefix(params.source, params.line, params.column);
			const trimmed = prefix.trimStart();

			// Tag trigger always takes priority
			if (trimmed.endsWith("@")) {
				return KNOWN_TAGS;
			}

			const result = parse(params.source);
			const ast = result.ast;

			// Type position trigger: after colon
			if (/:\s*$/.test(prefix)) {
				const types = ast ? collectTypeNames(ast) : [];
				return [...PRIMITIVE_TYPES, ...types];
			}

			// After reads/writes keyword: suggest entities
			if (/\b(?:reads|writes)\s+$/.test(prefix)) {
				return ast ? collectEntityNames(ast) : [];
			}

			// After "on" keyword (subscriber): suggest events
			if (/\bon\s+$/.test(prefix)) {
				return ast ? collectEventNames(ast) : [];
			}

			// After "pre" or "post" keyword: suggest invariants
			if (/\b(?:pre|post)\s+$/.test(prefix)) {
				if (ast) {
					const { astContext } = detectContext(ast, params.line, params.column);
					if (astContext) return collectInvariantNames(astContext);
				}
				return [];
			}

			// After "on" keyword in contract: suggest ports
			if (/\bcontract\s+\w+\s+on\s+$/.test(trimmed)) {
				if (ast) {
					const { astContext } = detectContext(ast, params.line, params.column);
					if (astContext) return collectPortNames(astContext);
				}
				return [];
			}

			// AST-aware structural completions (with indentation fallback)
			if (!ast) {
				// Fallback: use indentation heuristics when AST unavailable
				if (/^\t/.test(prefix) && !/^\t\t/.test(prefix)) {
					return DECLARATION_KEYWORDS;
				}
				if (/^\t\t/.test(prefix)) {
					return OPERATION_CLAUSE_KEYWORDS;
				}
				return TOP_LEVEL_KEYWORDS;
			}

			const { context, astContext } = detectContext(
				ast,
				params.line,
				params.column,
			);

			switch (context) {
				case "top-level":
					return TOP_LEVEL_KEYWORDS;
				case "extensions-body":
					return EXTENSION_TYPES;
				case "context-body":
					return [...DECLARATION_KEYWORDS, ...KNOWN_TAGS];
				case "entity-body":
					return [
						...PRIMITIVE_TYPES,
						...RELATIONSHIP_KEYWORDS,
						...(ast ? collectTypeNames(ast) : []),
					];
				case "value-body":
				case "type-body":
				case "error-body":
					return [...PRIMITIVE_TYPES, ...(ast ? collectTypeNames(ast) : [])];
				case "union-body":
					return PRIMITIVE_TYPES;
				case "operation-body":
					return OPERATION_CLAUSE_KEYWORDS;
				case "function-body":
					return OPERATION_CLAUSE_KEYWORDS.filter(
						(c) =>
							c.label === "input" ||
							c.label === "output" ||
							c.label === "errors",
					);
				case "invariant-body":
					return INVARIANT_CLAUSE_KEYWORDS;
				case "subscriber-body":
					return SUBSCRIBER_CLAUSE_KEYWORDS;
				case "port-body":
					return PRIMITIVE_TYPES;
				default:
					return TOP_LEVEL_KEYWORDS;
			}
		}),
});
