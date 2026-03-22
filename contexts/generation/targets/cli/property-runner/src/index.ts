import type { AnyPropertySuite } from "@morph/property";
import type {
	PropertyResult,
	PropertyRunner,
	PropertyRunOptions,
	PropertySuiteResult,
} from "@morph/property-runner";

import { isOperationSuite, isValidatorSuite } from "@morph/property";
import { printPropertySuiteResult } from "@morph/property-runner";

import { runCliOperationSuite } from "./operation-suite";

export interface CliPropertyRunnerConfig {
	readonly appName?: string;
	readonly command: string;
	readonly cwd?: string;
	readonly dataFile?: string;
	readonly optionNames?: OptionNames;
	readonly paramOrder: ParamOrder;
	readonly storage?: string;
}

export type OptionNames = Record<string, readonly string[]>;

export type ParamOrder = Record<string, readonly string[]>;

export const createPropertyCliRunner = (
	config: CliPropertyRunnerConfig,
): PropertyRunner => {
	const runAll = (
		suites: readonly AnyPropertySuite[],
		options: PropertyRunOptions = {},
	): Promise<PropertySuiteResult> => {
		const startTime = performance.now();
		const results: PropertyResult[] = [];

		for (const suite of suites) {
			if (isValidatorSuite(suite)) {
				results.push({
					description: suite.description,
					durationMs: 0,
					name: suite.name,
					numRuns: 0,
					passed: true,
				});
			} else if (isOperationSuite(suite)) {
				results.push(runCliOperationSuite(suite, options, config));
			}
		}

		const passed = results.filter((r) => r.passed).length;
		const failed = results.filter((r) => !r.passed).length;
		const totalDurationMs = performance.now() - startTime;

		return Promise.resolve({ failed, passed, results, totalDurationMs });
	};

	const runAllAndPrint = (
		suites: readonly AnyPropertySuite[],
		options: PropertyRunOptions = {},
	): Promise<PropertySuiteResult> =>
		runAll(suites, options).then((result) => {
			printPropertySuiteResult(result);
			return result;
		});

	return { runAll, runAllAndPrint };
};

export {
	printPropertyResult,
	printPropertySuiteResult,
} from "@morph/property-runner";
export type {
	PropertyResult,
	PropertyRunner,
	PropertyRunOptions,
	PropertySuiteResult,
} from "@morph/property-runner";
