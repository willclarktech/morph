// Generated from DomainSchema: Morph
// Do not edit manually

// Effect/Schema Definitions

import * as S from "effect/Schema";

// Pure Type Schemas (transformation-centric)

// A diagnostic message from parsing or compilation
export const DslDiagnosticSchema = S.Struct({
	column: S.Number,
	endColumn: S.Number,
	endLine: S.Number,
	line: S.Number,
	message: S.String,
	severity: S.Union(S.Literal("error"), S.Literal("warning")),
});

export type DslDiagnostic = S.Schema.Type<typeof DslDiagnosticSchema>;

export const parseDslDiagnostic = S.decodeUnknownSync(DslDiagnosticSchema);
export const parseDslDiagnosticEither =
	S.decodeUnknownEither(DslDiagnosticSchema);
export const encodeDslDiagnostic = S.encodeSync(DslDiagnosticSchema);

// A source range in a .morph file (1-based lines and columns)
export const DslRangeSchema = S.Struct({
	endColumn: S.Number,
	endLine: S.Number,
	startColumn: S.Number,
	startLine: S.Number,
});

export type DslRange = S.Schema.Type<typeof DslRangeSchema>;

export const parseDslRange = S.decodeUnknownSync(DslRangeSchema);
export const parseDslRangeEither = S.decodeUnknownEither(DslRangeSchema);
export const encodeDslRange = S.encodeSync(DslRangeSchema);

// A completion item for auto-complete
export const DslCompletionSchema = S.Struct({
	detail: S.optional(S.String),
	kind: S.String,
	label: S.String,
});

export type DslCompletion = S.Schema.Type<typeof DslCompletionSchema>;

export const parseDslCompletion = S.decodeUnknownSync(DslCompletionSchema);
export const parseDslCompletionEither =
	S.decodeUnknownEither(DslCompletionSchema);
export const encodeDslCompletion = S.encodeSync(DslCompletionSchema);

// A range that can be folded in the editor
export const DslFoldingRangeSchema = S.Struct({
	endLine: S.Number,
	startLine: S.Number,
});

export type DslFoldingRange = S.Schema.Type<typeof DslFoldingRangeSchema>;

export const parseDslFoldingRange = S.decodeUnknownSync(DslFoldingRangeSchema);
export const parseDslFoldingRangeEither = S.decodeUnknownEither(
	DslFoldingRangeSchema,
);
export const encodeDslFoldingRange = S.encodeSync(DslFoldingRangeSchema);

// Result of parsing a .morph source file
export const ParseResultSchema = S.Struct({
	diagnostics: S.Array(DslDiagnosticSchema),
	schema: S.String,
});

export type ParseResult = S.Schema.Type<typeof ParseResultSchema>;

export const parseParseResult = S.decodeUnknownSync(ParseResultSchema);
export const parseParseResultEither = S.decodeUnknownEither(ParseResultSchema);
export const encodeParseResult = S.encodeSync(ParseResultSchema);

// A document symbol (entity, command, etc.) for outline navigation
export interface DslSymbol {
	readonly children: readonly DslSymbol[];
	readonly kind: string;
	readonly name: string;
	readonly range: DslRange;
}

export const DslSymbolSchema: S.Schema<DslSymbol, DslSymbol> = S.Struct({
	children: S.suspend((): S.Schema.Any => S.Array(DslSymbolSchema)),
	kind: S.String,
	name: S.String,
	range: DslRangeSchema,
}) as unknown as S.Schema<DslSymbol, DslSymbol>;

export const parseDslSymbol = S.decodeUnknownSync(DslSymbolSchema);
export const parseDslSymbolEither = S.decodeUnknownEither(DslSymbolSchema);
export const encodeDslSymbol = S.encodeSync(DslSymbolSchema);

// Hover information for a source position
export const DslHoverResultSchema = S.Struct({
	content: S.String,
	range: S.optional(DslRangeSchema),
});

export type DslHoverResult = S.Schema.Type<typeof DslHoverResultSchema>;

export const parseDslHoverResult = S.decodeUnknownSync(DslHoverResultSchema);
export const parseDslHoverResultEither =
	S.decodeUnknownEither(DslHoverResultSchema);
export const encodeDslHoverResult = S.encodeSync(DslHoverResultSchema);

// A location in a .morph file for go-to-definition
export const DslLocationSchema = S.Struct({
	range: DslRangeSchema,
});

export type DslLocation = S.Schema.Type<typeof DslLocationSchema>;

export const parseDslLocation = S.decodeUnknownSync(DslLocationSchema);
export const parseDslLocationEither = S.decodeUnknownEither(DslLocationSchema);
export const encodeDslLocation = S.encodeSync(DslLocationSchema);

// Function Schemas (pure transformations)

import { InvalidSchemaError, ParseFailedError } from "./errors";

// Convert a domain schema JSON to .morph DSL text
export const DecompileSchemaInputSchema = S.Struct({
	schema: S.String,
});

export type DecompileSchemaInput = S.Schema.Type<
	typeof DecompileSchemaInputSchema
>;
export type DecompileSchemaOutput = string;
export type DecompileSchemaError = InvalidSchemaError;

// Format .morph DSL source text (parse and re-emit)
export const FormatDslInputSchema = S.Struct({
	source: S.String,
});

export type FormatDslInput = S.Schema.Type<typeof FormatDslInputSchema>;
export type FormatDslOutput = string;
export type FormatDslError = ParseFailedError;

// Get context-aware completions at a position in a .morph source file
export const GetCompletionsInputSchema = S.Struct({
	column: S.Number,
	line: S.Number,
	source: S.String,
});

export type GetCompletionsInput = S.Schema.Type<
	typeof GetCompletionsInputSchema
>;
export type GetCompletionsOutput = readonly DslCompletion[];

// Get go-to-definition location for a symbol at a position in a .morph source file
export const GetDefinitionInputSchema = S.Struct({
	column: S.Number,
	line: S.Number,
	source: S.String,
});

export type GetDefinitionInput = S.Schema.Type<typeof GetDefinitionInputSchema>;
export type GetDefinitionOutput = DslLocation;

// Get diagnostics (errors and warnings) for a .morph source file
export const GetDiagnosticsInputSchema = S.Struct({
	source: S.String,
});

export type GetDiagnosticsInput = S.Schema.Type<
	typeof GetDiagnosticsInputSchema
>;
export type GetDiagnosticsOutput = readonly DslDiagnostic[];

// Get folding ranges for a .morph source file
export const GetFoldingRangesInputSchema = S.Struct({
	source: S.String,
});

export type GetFoldingRangesInput = S.Schema.Type<
	typeof GetFoldingRangesInputSchema
>;
export type GetFoldingRangesOutput = readonly DslFoldingRange[];

// Get hover information at a position in a .morph source file
export const GetHoverInputSchema = S.Struct({
	column: S.Number,
	line: S.Number,
	source: S.String,
});

export type GetHoverInput = S.Schema.Type<typeof GetHoverInputSchema>;
export type GetHoverOutput = DslHoverResult;

// Get document symbols (outline) for a .morph source file
export const GetSymbolsInputSchema = S.Struct({
	source: S.String,
});

export type GetSymbolsInput = S.Schema.Type<typeof GetSymbolsInputSchema>;
export type GetSymbolsOutput = readonly DslSymbol[];

// Parse and compile a .morph DSL source to domain schema JSON
export const ParseMorphInputSchema = S.Struct({
	source: S.String,
});

export type ParseMorphInput = S.Schema.Type<typeof ParseMorphInputSchema>;
export type ParseMorphOutput = ParseResult;
export type ParseMorphError = ParseFailedError;

// Validate a .morph DSL source file
export const ValidateDslInputSchema = S.Struct({
	source: S.String,
});

export type ValidateDslInput = S.Schema.Type<typeof ValidateDslInputSchema>;
export type ValidateDslOutput = void;
export type ValidateDslError = ParseFailedError;

// Get a template .morph schema showing all available DSL features and field types
export const TemplateSchemaInputSchema = S.Struct({});

export type TemplateSchemaInput = S.Schema.Type<
	typeof TemplateSchemaInputSchema
>;
export type TemplateSchemaOutput = string;
