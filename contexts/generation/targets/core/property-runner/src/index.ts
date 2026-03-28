import type { AnyPropertySuite } from "@morph/property";
import type {
	PropertyResult,
	PropertyRunner,
	PropertyRunOptions,
	PropertySuiteResult,
} from "@morph/property-runner";
import type { Layer } from "effect";

import { isOperationSuite, isValidatorSuite } from "@morph/property";
import { printPropertySuiteResult } from "@morph/property-runner";
import { Effect } from "effect";

import { runOperationSuite } from "./operation-suite";
import { runValidatorSuite } from "./validator-suite";

export interface LibraryPropertyRunnerConfig<R> {
	readonly layer: Layer.Layer<R>;
	readonly operations: Record<string, OperationFunction<R>>;
	readonly validators: Record<string, ValidatorFunction<R>>;
}

export type OperationFunction<R> = (
	params: unknown,
) => Effect.Effect<unknown, unknown, R>;

export type ValidatorFunction<R> = (
	input: unknown,
	context: unknown,
) => Effect.Effect<void, unknown, R>;

export const createPropertyLibraryRunner = <R>(
	config: LibraryPropertyRunnerConfig<R>,
): PropertyRunner => {
	const runtime = Effect.runSync(
		Effect.runtime<R>().pipe(Effect.provide(config.layer)),
	);

	const runAll = (
		suites: readonly AnyPropertySuite[],
		options: PropertyRunOptions = {},
	): Promise<PropertySuiteResult> => {
		const startTime = performance.now();
		const results: PropertyResult[] = [];

		for (const suite of suites) {
			if (isValidatorSuite(suite)) {
				results.push(
					runValidatorSuite(suite, options, config.validators, runtime),
				);
			} else if (isOperationSuite(suite)) {
				results.push(
					runOperationSuite(suite, options, config.operations, runtime),
				);
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
