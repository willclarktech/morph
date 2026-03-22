// Generated mocks for Morph DSL testing
// Do not edit - regenerate from schema

import { type MockFunction, createMockFunction } from "@morph/testing";

export { type MockFunction, createMockFunction } from "@morph/testing";

/**
 * Mock dependencies for testing.
 */
export interface MockDeps {
	readonly generateId: MockFunction<[], string>;
}

export const createMockDeps = (): MockDeps => ({
	generateId: createMockFunction(),
});

/**
 * Reset all mocks to initial state.
 */
export const resetMocks = (deps: MockDeps): void => {
	deps.generateId.reset();
};
