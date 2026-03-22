// Generated mock handlers layer
// Combines all mock handler implementations for testing
// Do not edit - regenerate from schema

import { Layer } from "effect";

import { GenerateHandlerMock } from "../operations/generate/mock-impl";
import { InitHandlerMock } from "../operations/init/mock-impl";
import { NewProjectHandlerMock } from "../operations/new-project/mock-impl";
import { ValidateHandlerMock } from "../operations/validate/mock-impl";

/**
 * Combined layer with all mock handler implementations.
 * Returns deterministic random data using fast-check arbitraries.
 */
export const MockHandlersLayer = Layer.mergeAll(
	GenerateHandlerMock,
	InitHandlerMock,
	NewProjectHandlerMock,
	ValidateHandlerMock,
);
