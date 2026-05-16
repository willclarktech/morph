export { decompileSchema, DecompileSchemaHandler } from "./decompile-schema";
export { formatDsl, FormatDslHandler } from "./format-dsl";
export { getCompletions, GetCompletionsHandler } from "./get-completions";
export { getDefinition, GetDefinitionHandler } from "./get-definition";
export { getDiagnostics, GetDiagnosticsHandler } from "./get-diagnostics";
export {
	getFoldingRanges,
	GetFoldingRangesHandler,
} from "./get-folding-ranges";
export { getHover, GetHoverHandler } from "./get-hover";
export { getSymbols, GetSymbolsHandler } from "./get-symbols";
export { parseMorph, ParseMorphHandler } from "./parse-morph";
export {
	TEMPLATE_SCHEMA,
	templateSchema,
	TemplateSchemaHandler,
} from "./template-schema";
export { validateDsl, ValidateDslHandler } from "./validate-dsl";

export { languageConfiguration, textMateGrammar } from "./grammar";
export { prose } from "./prose";
