import type { OperationPropertySuite } from "@morph/property";
import type {
	PropertyResult,
	PropertyRunOptions,
} from "@morph/property-runner";

import * as fc from "fast-check";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

import type { CliPropertyRunnerConfig } from "./index";

const toKebabCase = (s: string): string =>
	s.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const toEnvironmentPrefix = (name: string): string =>
	name.toUpperCase().replaceAll("-", "_");

export const runCliOperationSuite = (
	suite: OperationPropertySuite<unknown, unknown, unknown>,
	options: PropertyRunOptions,
	config: CliPropertyRunnerConfig,
): PropertyResult => {
	const cliCommand = toKebabCase(suite.operationName);
	const dataFile = config.dataFile ?? "/tmp/morph-property-test-data.json";
	const storage = config.storage ?? "jsonfile";
	const envPrefix = config.appName ? toEnvironmentPrefix(config.appName) : "";

	if (!config.paramOrder[cliCommand]) {
		return {
			description: suite.description,
			durationMs: 0,
			error: new Error(`Unknown CLI command: ${cliCommand}`),
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
				try {
					rmSync(dataFile);
				} catch {
					// Ignore if file doesn't exist
				}

				const params = suite.toParams(input, context) as Record<
					string,
					unknown
				>;

				// Build positional args from required params
				const paramOrder = config.paramOrder[cliCommand] ?? [];
				const positionalArguments = paramOrder
					.map((key) => JSON.stringify(params[key]))
					.join(" ");

				// Build flags from optional params
				const optionNames = config.optionNames?.[cliCommand] ?? [];
				const flags = optionNames
					.filter((key) => params[key] !== undefined)
					.map((key) => `--${toKebabCase(key)} ${JSON.stringify(params[key])}`)
					.join(" ");

				const allArguments = [positionalArguments, flags]
					.filter(Boolean)
					.join(" ");

				const storageEnvironmentVariable = envPrefix
					? `${envPrefix}_STORAGE`
					: "STORAGE";
				const dataFileEnvironmentVariable = envPrefix
					? `${envPrefix}_DATA_FILE`
					: "DATA_FILE";

				const result = execSync(
					`${config.command} ${cliCommand} ${allArguments}`,
					{
						cwd: config.cwd,
						encoding: "utf8",
						env: {
							...process.env,
							[dataFileEnvironmentVariable]: dataFile,
							[storageEnvironmentVariable]: storage,
						},
					},
				);

				const output = JSON.parse(result) as unknown;
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
