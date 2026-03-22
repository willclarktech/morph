// Generated mock handlers layer
// Combines all mock handler implementations for testing
// Do not edit - regenerate from schema

import { Layer } from "effect";

import { DecompileSchemaHandlerMock } from "../operations/decompile-schema/mock-impl";
import { FormatDslHandlerMock } from "../operations/format-dsl/mock-impl";
import { GetCompletionsHandlerMock } from "../operations/get-completions/mock-impl";
import { GetDefinitionHandlerMock } from "../operations/get-definition/mock-impl";
import { GetDiagnosticsHandlerMock } from "../operations/get-diagnostics/mock-impl";
import { GetFoldingRangesHandlerMock } from "../operations/get-folding-ranges/mock-impl";
import { GetHoverHandlerMock } from "../operations/get-hover/mock-impl";
import { GetSymbolsHandlerMock } from "../operations/get-symbols/mock-impl";
import { ParseMorphHandlerMock } from "../operations/parse-morph/mock-impl";
import { TemplateSchemaHandlerMock } from "../operations/template-schema/mock-impl";
import { ValidateDslHandlerMock } from "../operations/validate-dsl/mock-impl";

/**
 * Combined layer with all mock handler implementations.
 * Returns deterministic random data using fast-check arbitraries.
 */
export const MockHandlersLayer = Layer.mergeAll(
	DecompileSchemaHandlerMock,
	FormatDslHandlerMock,
	GetCompletionsHandlerMock,
	GetDefinitionHandlerMock,
	GetDiagnosticsHandlerMock,
	GetFoldingRangesHandlerMock,
	GetHoverHandlerMock,
	GetSymbolsHandlerMock,
	ParseMorphHandlerMock,
	TemplateSchemaHandlerMock,
	ValidateDslHandlerMock,
);
