/* eslint-disable no-console -- test output */
import type { Scenario } from "@morphdsl/scenario";
import type { Effect } from "effect";

/**
 * Operations implementation - maps operation names to Effect functions.
 */
export type Operations<R> = Record<
	string,
	(params: unknown) => Effect.Effect<unknown, unknown, R>
>;

/**
 * Prose configuration - maps operation names to template strings.
 */
export type Prose = Record<string, string>;

/**
 * Options for running multiple scenarios.
 */
export interface RunAllOptions {
	readonly tags?: readonly string[];
}

/**
 * Common runner interface.
 */
export interface Runner {
	readonly run: (scenario: Scenario) => Promise<ScenarioResult>;
	readonly runAll: (
		scenarios: readonly Scenario[],
		options?: RunAllOptions,
	) => Promise<SuiteResult>;
	readonly runAllAndPrint: (
		scenarios: readonly Scenario[],
		options?: RunAllOptions,
	) => Promise<SuiteResult>;
	readonly runAndPrint: (scenario: Scenario) => Promise<ScenarioResult>;
}

/**
 * Result of running a complete scenario.
 */
export interface ScenarioResult {
	readonly passed: boolean;
	readonly scenarioName: string;
	readonly steps: readonly StepResult[];
	readonly totalDurationMs: number;
}

/**
 * Result of running a single step.
 */
export interface StepResult {
	readonly durationMs: number;
	readonly error?: unknown;
	readonly passed: boolean;
	readonly prose: string;
}

/**
 * Result of running multiple scenarios.
 */
export interface SuiteResult {
	readonly failed: number;
	readonly passed: number;
	readonly results: readonly ScenarioResult[];
	readonly skipped: number;
	readonly totalDurationMs: number;
}

/**
 * Print scenario result in Cucumber-style format.
 */
export const printResult = (result: ScenarioResult): void => {
	console.log(`\nScenario: ${result.scenarioName}`);

	for (const stepResult of result.steps) {
		const icon = stepResult.passed ? "\u2713" : "\u2717";
		const timing = `(${stepResult.durationMs.toFixed(0)}ms)`;
		console.log(`  ${icon} ${stepResult.prose} ${timing}`);

		if (stepResult.error) {
			const message =
				stepResult.error instanceof Error
					? stepResult.error.message
					: typeof stepResult.error === "string"
						? stepResult.error
						: JSON.stringify(stepResult.error);
			console.log(`      Error: ${message}`);
		}
	}

	const passedCount = result.steps.filter((s) => s.passed).length;
	const totalCount = result.steps.length;
	const status = result.passed ? "passed" : "failed";
	console.log(
		`\n1 scenario (1 ${status})\n${totalCount} steps (${passedCount} passed)\n${(result.totalDurationMs / 1000).toFixed(3)}s`,
	);
};

/**
 * Print suite result summary.
 */
export const printSuiteResult = (
	result: SuiteResult,
	options?: RunAllOptions,
): void => {
	for (const scenarioResult of result.results) {
		printResult(scenarioResult);
	}

	const tagInfo = options?.tags ? ` (tags: ${options.tags.join(", ")})` : "";
	const total = result.passed + result.failed;
	const skippedInfo = result.skipped > 0 ? `, ${result.skipped} skipped` : "";

	console.log(`\n${"\u2500".repeat(60)}`);
	console.log(`Suite Summary${tagInfo}`);
	console.log("\u2500".repeat(60));
	console.log(
		`${total} scenarios (${result.passed} passed, ${result.failed} failed${skippedInfo})`,
	);
	console.log(`Total time: ${(result.totalDurationMs / 1000).toFixed(3)}s`);
};

/**
 * Filter scenarios by tags.
 * Returns scenarios that have at least one of the specified tags.
 */
export const filterByTags = (
	scenarios: readonly Scenario[],
	...tags: readonly string[]
): readonly Scenario[] =>
	scenarios.filter((s) => tags.some((t) => s.tags.includes(t)));

export { formatAssertionProse, getField, runAssertion } from "./assertions";
export { interpolateBindings, resolveParameters } from "./bindings";
export { renderStepProse } from "./prose";
export { resolveOperationName } from "./resolve";
export {
	createRunner,
	type ExecuteOperation,
	type LifecycleConfig,
	runScenario,
	type RunScenarioConfig,
} from "./run";
