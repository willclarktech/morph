// Generated operations barrel

import { Layer } from "effect";

import { GenerateHandlerMock } from "./generate/mock-impl";
import { InitHandlerMock } from "./init/mock-impl";
import { NewProjectHandlerMock } from "./new-project/mock-impl";
import { ValidateHandlerMock } from "./validate/mock-impl";

import { GenerateHandlerLive } from "./generate/impl";
import { InitHandlerLive } from "./init/impl";
import { NewProjectHandlerLive } from "./new-project/impl";
import { ValidateHandlerLive } from "./validate/impl";

export * from "./generate";
export * from "./init";
export * from "./new-project";
export * from "./validate";

/**
 * Combined layer with mock handler implementations for testing.
 * Use this layer when you need arbitrary/generated test data.
 */
export const MockHandlersLayer = Layer.mergeAll(
	GenerateHandlerMock,
	InitHandlerMock,
	NewProjectHandlerMock,
	ValidateHandlerMock,
);

/**
 * Combined layer with real handler implementations.
 * Use this layer for actual application behavior with repositories.
 */
export const HandlersLayer = Layer.mergeAll(
	GenerateHandlerLive,
	InitHandlerLive,
	NewProjectHandlerLive,
	ValidateHandlerLive,
);
