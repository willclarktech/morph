import type { Scenario } from "@morphdsl/scenario";

import { isAssertion } from "@morphdsl/scenario";

import type {
	Prose,
	RunAllOptions,
	Runner,
	ScenarioResult,
	StepResult,
	SuiteResult,
} from "./index";

import { getField, runAssertion } from "./assertions";
import { resolveParameters } from "./bindings";
import { filterByTags, printResult, printSuiteResult } from "./index";
import { renderStepProse } from "./prose";

export type ExecuteOperation = (
	name: string,
	params: Record<string, unknown>,
	bindings: Map<string, unknown>,
) => Promise<{ readonly authToken?: string; readonly result: unknown }>;

export interface RunScenarioConfig {
	readonly execute: ExecuteOperation;
	readonly prose?: Prose | undefined;
	readonly injectableParamNames?: readonly string[] | undefined;
}

export interface LifecycleConfig {
	readonly reset?: () => void | Promise<void>;
	readonly cleanup?: () => void | Promise<void>;
}

export const runScenario = async (
	scenario: Scenario,
	config: RunScenarioConfig,
): Promise<ScenarioResult> => {
	const bindings = new Map<string, unknown>();
	const stepResults: StepResult[] = [];
	let lastResult: unknown;
	const startTime = performance.now();

	for (const step of scenario.steps) {
		const stepStart = performance.now();
		let passed = true;
		let error: unknown;

		if (isAssertion(step.operation)) {
			const assertion = step.operation;
			const subject =
				assertion.subject === "lastResult"
					? lastResult
					: bindings.get(assertion.subject);
			const value = assertion.field
				? getField(subject, assertion.field)
				: subject;

			try {
				runAssertion(value, assertion.matcher);
			} catch (error_) {
				passed = false;
				error = error_;
			}
		} else {
			const op = step.operation;
			const resolvedParameters = resolveParameters(
				op.params,
				bindings,
				config.injectableParamNames,
			);

			try {
				const executeResult = await config.execute(
					op.name,
					resolvedParameters as Record<string, unknown>,
					bindings,
				);
				lastResult = executeResult.result;

				if (step.binding) {
					bindings.set(step.binding, lastResult);
				}
			} catch (error_) {
				passed = false;
				error = error_;
			}
		}

		const renderedProse = renderStepProse(
			step,
			scenario.actor,
			config.prose,
			bindings,
		);
		const durationMs = performance.now() - stepStart;

		stepResults.push({
			durationMs,
			error,
			passed,
			prose: renderedProse,
		});

		if (!passed) break;
	}

	const totalDurationMs = performance.now() - startTime;

	return {
		passed: stepResults.every((s) => s.passed),
		scenarioName: scenario.name,
		steps: stepResults,
		totalDurationMs,
	};
};

export const createRunner = (
	config: RunScenarioConfig,
	lifecycle?: LifecycleConfig,
): Runner => {
	const run = (scenario: Scenario): Promise<ScenarioResult> =>
		runScenario(scenario, config);

	const runAndPrint = async (scenario: Scenario): Promise<ScenarioResult> => {
		const result = await run(scenario);
		printResult(result);
		return result;
	};

	const runAll = async (
		scenarios: readonly Scenario[],
		options?: RunAllOptions,
	): Promise<SuiteResult> => {
		const startTime = performance.now();
		const filtered = options?.tags
			? filterByTags(scenarios, ...options.tags)
			: scenarios;
		const skipped = scenarios.length - filtered.length;

		const results: ScenarioResult[] = [];
		for (const scenario of filtered) {
			if (lifecycle?.reset && results.length > 0) {
				await lifecycle.reset();
			}
			results.push(await run(scenario));
		}

		if (lifecycle?.cleanup) {
			await lifecycle.cleanup();
		}

		const passed = results.filter((r) => r.passed).length;
		const failed = results.filter((r) => !r.passed).length;
		const totalDurationMs = performance.now() - startTime;

		return { failed, passed, results, skipped, totalDurationMs };
	};

	const runAllAndPrint = async (
		scenarios: readonly Scenario[],
		options?: RunAllOptions,
	): Promise<SuiteResult> => {
		const result = await runAll(scenarios, options);
		printSuiteResult(result, options);
		return result;
	};

	return { run, runAll, runAllAndPrint, runAndPrint };
};
