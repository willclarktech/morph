/* eslint-disable no-console -- test output */
/**
 * Morph Property Runner - Shared Types
 *
 * Common types and interfaces for property test runners.
 */

import type { AnyPropertySuite } from "@morphdsl/property";

/**
 * Result of running a single property test.
 */
export interface PropertyResult {
	readonly counterexample?: unknown;
	readonly description: string;
	readonly durationMs: number;
	readonly error?: unknown;
	readonly name: string;
	readonly numRuns: number;
	readonly numShrinks?: number | undefined;
	readonly passed: boolean;
	readonly path?: string | undefined;
	readonly seed?: number | undefined;
}

/**
 * Common property runner interface.
 * Implementations exist for library (Effect) and CLI (subprocess) execution.
 */
export interface PropertyRunner {
	readonly runAll: (
		suites: readonly AnyPropertySuite[],
		options?: PropertyRunOptions,
	) => Promise<PropertySuiteResult>;

	readonly runAllAndPrint: (
		suites: readonly AnyPropertySuite[],
		options?: PropertyRunOptions,
	) => Promise<PropertySuiteResult>;
}

/**
 * Options for running property tests.
 */
export interface PropertyRunOptions {
	/** Number of test runs (default: 100) */
	readonly numRuns?: number;
	/** Seed for reproducibility */
	readonly seed?: number;
	/** Verbose output */
	readonly verbose?: boolean;
}

/**
 * Result of running multiple property tests.
 */
export interface PropertySuiteResult {
	readonly failed: number;
	readonly passed: number;
	readonly results: readonly PropertyResult[];
	readonly totalDurationMs: number;
}

/**
 * Print a single property result.
 */
export const printPropertyResult = (result: PropertyResult): void => {
	const icon = result.passed ? "\u2713" : "\u2717";
	const timing = `(${result.durationMs.toFixed(0)}ms, ${result.numRuns} runs)`;
	console.log(`  ${icon} ${result.name}: ${result.description} ${timing}`);

	if (!result.passed) {
		// Show counterexample with pretty-printing
		if (result.counterexample !== undefined) {
			console.log("      Counterexample:");
			// If it's already a string (from regex capture), show directly
			const formatted =
				typeof result.counterexample === "string"
					? result.counterexample
					: JSON.stringify(result.counterexample, undefined, 2);
			const indented = formatted
				.split("\n")
				.map((line) => `        ${line}`)
				.join("\n");
			console.log(indented);
		}

		// Show seed for reproducibility
		if (result.seed !== undefined) {
			console.log(
				`      Seed: ${result.seed} (rerun with --seed=${result.seed})`,
			);
		}

		// Show shrink info
		if (result.numShrinks !== undefined && result.numShrinks > 0) {
			console.log(`      Shrunk ${result.numShrinks} time(s)`);
		}

		// Show path for debugging
		if (result.path !== undefined) {
			console.log(`      Path: ${result.path}`);
		}

		// Show error message
		if (result.error) {
			const message =
				result.error instanceof Error
					? result.error.message
					: typeof result.error === "string"
						? result.error
						: JSON.stringify(result.error);
			// Only show if it adds information beyond counterexample
			if (!message.includes("Property failed")) {
				console.log(`      Error: ${message}`);
			}
		}
	}
};

/**
 * Print suite result summary.
 */
export const printPropertySuiteResult = (result: PropertySuiteResult): void => {
	console.log("\nProperty Tests:");

	for (const propertyResult of result.results) {
		printPropertyResult(propertyResult);
	}

	const total = result.passed + result.failed;
	console.log(`\n${"\u2500".repeat(60)}`);
	console.log("Property Suite Summary");
	console.log("\u2500".repeat(60));
	console.log(
		`${total} properties (${result.passed} passed, ${result.failed} failed)`,
	);
	console.log(`Total time: ${(result.totalDurationMs / 1000).toFixed(3)}s`);
};
