import type { DomainSchema } from "@morph/domain-schema";

import { getAggregateRoots } from "@morph/domain-schema";
import { indent, toCamelCase, toPascalCase } from "@morph/utils";

/**
 * Generate mock dependencies for DSL testing.
 * Creates mock implementations with call tracking for each repository.
 */
export const generateMocks = (schema: DomainSchema): string => {
	const aggregateRoots = getAggregateRoots(schema).map((entry) => entry.name);

	const header = [
		`// Generated mocks for ${schema.name} DSL testing`,
		"// Do not edit - regenerate from schema",
		"",
		`import { type MockFunction, createMockFunction } from "@morph/testing";`,
		"",
		`export { type MockFunction, createMockFunction } from "@morph/testing";`,
		"",
	].join("\n");

	const repositoryMocks = aggregateRoots
		.map((name) => generateRepositoryMock(name))
		.join("\n");
	const mockDepsFactory = generateMockDepsFactory(aggregateRoots);
	const resetFunction = generateResetFunction(aggregateRoots);

	return [header, repositoryMocks, mockDepsFactory, resetFunction].join("\n");
};

/**
 * Generate a mock repository for an aggregate root.
 */
const generateRepositoryMock = (entityName: string): string => {
	const mockName = `mock${toPascalCase(entityName)}Repository`;

	return `
/**
 * Mock ${entityName} repository.
 */
export interface Mock${toPascalCase(entityName)}Repository {
	readonly create: MockFunction<[data: Record<string, unknown>], unknown>;
	readonly findById: MockFunction<[id: string], unknown>;
	readonly findAll: MockFunction<[], readonly unknown[]>;
	readonly update: MockFunction<
		[id: string, data: Record<string, unknown>],
		unknown
	>;
	readonly delete: MockFunction<[id: string], void>;
}

export const ${mockName} = (): Mock${toPascalCase(entityName)}Repository => ({
	create: createMockFunction(),
	findById: createMockFunction(),
	findAll: createMockFunction(),
	update: createMockFunction(),
	delete: createMockFunction(),
});
`;
};

/**
 * Generate the createMockDeps factory function.
 */
const generateMockDepsFactory = (aggregateRoots: readonly string[]): string => {
	if (aggregateRoots.length === 0) {
		return `
/**
 * Mock dependencies for testing.
 */
export interface MockDeps {
	readonly generateId: MockFunction<[], string>;
}

export const createMockDeps = (): MockDeps => ({
	generateId: createMockFunction(),
});
`;
	}

	const repoProperties = indent(
		aggregateRoots
			.map((name) => {
				const repoName = `${toCamelCase(name)}Repository`;
				return `readonly ${repoName}: Mock${toPascalCase(name)}Repository;`;
			})
			.join("\n"),
		1,
	);

	const repoInits = indent(
		aggregateRoots
			.map((name) => {
				const repoName = `${toCamelCase(name)}Repository`;
				const mockName = `mock${toPascalCase(name)}Repository`;
				return `${repoName}: ${mockName}(),`;
			})
			.join("\n"),
		2,
	);

	return `
/**
 * Mock dependencies for testing.
 */
export interface MockDeps {
	readonly generateId: MockFunction<[], string>;
${repoProperties}
}

export const createMockDeps = (): MockDeps => ({
	generateId: createMockFunction(),
${repoInits}
});
`;
};

/**
 * Generate the reset function to clear all mocks.
 */
const generateResetFunction = (aggregateRoots: readonly string[]): string => {
	if (aggregateRoots.length === 0) {
		return `
/**
 * Reset all mocks to initial state.
 */
export const resetMocks = (deps: MockDeps): void => {
	deps.generateId.reset();
};
`;
	}

	const resets = aggregateRoots
		.flatMap((name) => {
			const repoName = `${toCamelCase(name)}Repository`;
			return [
				`\tdeps.${repoName}.create.reset();`,
				`\tdeps.${repoName}.findById.reset();`,
				`\tdeps.${repoName}.findAll.reset();`,
				`\tdeps.${repoName}.update.reset();`,
				`\tdeps.${repoName}.delete.reset();`,
			];
		})
		.join("\n");

	return `
/**
 * Reset all mocks to initial state.
 */
export const resetMocks = (deps: MockDeps): void => {
	deps.generateId.reset();
${resets}
};
`;
};
