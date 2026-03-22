import type { OperationPropertySuite } from "@morph/property";
import type { PropertyResult, PropertyRunOptions } from "@morph/property-runner";

import type { OperationFunction } from "./index";
import { Effect, Layer, Runtime } from "effect";
import * as fc from "fast-check";

export const runOperationSuite = <R>(
	suite: OperationPropertySuite<unknown, unknown, unknown>,
	options: PropertyRunOptions,
	operations: Record<string, OperationFunction<R>>,
	runtime: Runtime.Runtime<R>,
): PropertyResult => {
	const operation = operations[suite.operationName];
	if (!operation) {
		return {
			description: suite.description,
			durationMs: 0,
			error: new Error(`Unknown operation: ${suite.operationName}`),
			name: suite.name,
			numRuns: 0,
			passed: false,
		};
	}

	const startTime = performance.now();
	let counterexample: unknown;
	let error: unknown;
	let seed: number | undefined;
	let numberShrinks: number | undefined;
	let path: string | undefined;

	const arbitrary = suite.contextArbitrary
		? fc.tuple(suite.arbitrary, suite.contextArbitrary)
		: fc.tuple(suite.arbitrary, fc.constant(undefined));

	const fcParameters = {
		numRuns: options.numRuns ?? 100,
		...(options.seed !== undefined && { seed: options.seed }),
		...(options.verbose && { verbose: true }),
	};

	try {
		fc.assert(
			fc.property(arbitrary, ([input, context]) => {
				const params = suite.toParams(input, context);

				const output = Effect.runSync(
					operation(params).pipe(
						Effect.provide(Layer.succeedContext(runtime.context)),
					),
				);

				return suite.predicate(input, output, context);
			}),
			fcParameters,
		);
	} catch (error_) {
		error = error_;
		if (error_ instanceof Error) {
			const message = error_.message;
			const seedValue = /seed: (-?\d+)/.exec(message)?.[1];
			const pathValue = /path: "([^"]+)"/.exec(message)?.[1];
			const shrunkValue = /Shrunk (\d+) time/.exec(message)?.[1];
			const counterValue = /Counterexample: (\[[\s\S]*?\])(?:\n|$)/.exec(
				message,
			)?.[1];

			seed = seedValue ? Number.parseInt(seedValue, 10) : undefined;
			path = pathValue;
			numberShrinks = shrunkValue
				? Number.parseInt(shrunkValue, 10)
				: undefined;
			if (counterValue) {
				try {
					counterexample = JSON.parse(counterValue);
				} catch {
					counterexample = counterValue;
				}
			}
		}
	}

	const durationMs = performance.now() - startTime;

	return {
		counterexample,
		description: suite.description,
		durationMs,
		error,
		name: suite.name,
		numRuns: options.numRuns ?? 100,
		numShrinks: numberShrinks,
		passed: error === undefined,
		path,
		seed,
	};
};
