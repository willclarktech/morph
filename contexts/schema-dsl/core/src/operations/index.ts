// Generated operations barrel
import { Layer } from "effect";

import { DecompileSchemaHandlerLive } from "./decompile-schema/impl";
import { DecompileSchemaHandlerMock } from "./decompile-schema/mock-impl";
import { FormatDslHandlerLive } from "./format-dsl/impl";
import { FormatDslHandlerMock } from "./format-dsl/mock-impl";
import { GetCompletionsHandlerLive } from "./get-completions/impl";
import { GetCompletionsHandlerMock } from "./get-completions/mock-impl";
import { GetDefinitionHandlerLive } from "./get-definition/impl";
import { GetDefinitionHandlerMock } from "./get-definition/mock-impl";
import { GetDiagnosticsHandlerLive } from "./get-diagnostics/impl";
import { GetDiagnosticsHandlerMock } from "./get-diagnostics/mock-impl";
import { GetFoldingRangesHandlerLive } from "./get-folding-ranges/impl";
import { GetFoldingRangesHandlerMock } from "./get-folding-ranges/mock-impl";
import { GetHoverHandlerLive } from "./get-hover/impl";
import { GetHoverHandlerMock } from "./get-hover/mock-impl";
import { GetSymbolsHandlerLive } from "./get-symbols/impl";
import { GetSymbolsHandlerMock } from "./get-symbols/mock-impl";
import { ParseMorphHandlerLive } from "./parse-morph/impl";
import { ParseMorphHandlerMock } from "./parse-morph/mock-impl";
import { TemplateSchemaHandlerLive } from "./template-schema/impl";
import { TemplateSchemaHandlerMock } from "./template-schema/mock-impl";
import { ValidateDslHandlerLive } from "./validate-dsl/impl";
import { ValidateDslHandlerMock } from "./validate-dsl/mock-impl";

export * from "./decompile-schema";
export * from "./format-dsl";
export * from "./get-completions";
export * from "./get-definition";
export * from "./get-diagnostics";
export * from "./get-folding-ranges";
export * from "./get-hover";
export * from "./get-symbols";
export * from "./parse-morph";
export * from "./template-schema";
export * from "./validate-dsl";

/**
 * Combined layer with mock handler implementations for testing.
 * Use this layer when you need arbitrary/generated test data.
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

/**
 * Combined layer with real handler implementations.
 * Use this layer for actual application behavior with repositories.
 */
export const HandlersLayer = Layer.mergeAll(
	DecompileSchemaHandlerLive,
	FormatDslHandlerLive,
	GetCompletionsHandlerLive,
	GetDefinitionHandlerLive,
	GetDiagnosticsHandlerLive,
	GetFoldingRangesHandlerLive,
	GetHoverHandlerLive,
	GetSymbolsHandlerLive,
	ParseMorphHandlerLive,
	TemplateSchemaHandlerLive,
	ValidateDslHandlerLive,
);
