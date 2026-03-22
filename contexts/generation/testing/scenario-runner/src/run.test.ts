import { describe, expect, test } from "bun:test";

import { assert, given, scenario, then, when } from "@morph/scenario";

import type { ExecuteOperation, RunScenarioConfig } from "./run";

import { createRunner, runScenario } from "./run";

const makeOp = (name: string, params: unknown) => ({
	_tag: "OperationCall" as const,
	name,
	params,
});

const mockExecute: ExecuteOperation = async (name, params) => {
	switch (name) {
		case "createUser":
			return {
				result: {
					id: "u1",
					name: (params as { name: string }).name,
				},
			};
		case "createPost":
			return {
				result: {
					id: "p1",
					authorId: (params as { authorId: string }).authorId,
					title: (params as { title: string }).title,
				},
			};
		case "failOp":
			throw new Error("operation failed");
		default:
			return { result: { ok: true } };
	}
};

const config: RunScenarioConfig = { execute: mockExecute };

describe("runScenario", () => {
	test("runs all steps in a passing scenario", async () => {
		const s = scenario("Create a user")
			.withActor("Alice")
			.steps(
				given(makeOp("createUser", { name: "Alice" })).as("user"),
				then(assert("user", "name").toBe("Alice")),
			);

		const result = await runScenario(s, config);

		expect(result.passed).toBe(true);
		expect(result.scenarioName).toBe("Create a user");
		expect(result.steps).toHaveLength(2);
		expect(result.steps[0]!.passed).toBe(true);
		expect(result.steps[1]!.passed).toBe(true);
	});

	test("bindings from step 1 are available in step 2", async () => {
		const s = scenario("Cross-step bindings")
			.steps(
				given(makeOp("createUser", { name: "Bob" })).as("user"),
				when(makeOp("createPost", { authorId: "$user.id", title: "Test" })).as("post"),
				then(assert("post", "authorId").toBe("u1")),
			);

		const result = await runScenario(s, config);

		expect(result.passed).toBe(true);
		expect(result.steps).toHaveLength(3);
	});

	test("stops on first failure", async () => {
		const s = scenario("Fail early")
			.steps(
				given(makeOp("createUser", { name: "Alice" })).as("user"),
				then(assert("user", "name").toBe("WRONG")),
				then(assert("user", "id").toBeDefined()),
			);

		const result = await runScenario(s, config);

		expect(result.passed).toBe(false);
		// Only 2 steps executed — third is skipped
		expect(result.steps).toHaveLength(2);
		expect(result.steps[0]!.passed).toBe(true);
		expect(result.steps[1]!.passed).toBe(false);
		expect(result.steps[1]!.error).toBeDefined();
	});

	test("captures execute errors", async () => {
		const s = scenario("Operation throws")
			.steps(
				when(makeOp("failOp", {})).step,
			);

		const result = await runScenario(s, config);

		expect(result.passed).toBe(false);
		expect(result.steps[0]!.passed).toBe(false);
		expect(result.steps[0]!.error).toBeInstanceOf(Error);
	});

	test("renders prose for each step", async () => {
		const proseConfig: RunScenarioConfig = {
			execute: mockExecute,
			prose: { createUser: "{actor} creates user {name}" },
		};

		const s = scenario("With prose")
			.withActor("Admin")
			.steps(
				given(makeOp("createUser", { name: "Alice" })).as("user"),
			);

		const result = await runScenario(s, proseConfig);

		expect(result.steps[0]!.prose).toBe("Admin creates user Alice");
	});

	test("tracks timing for each step", async () => {
		const s = scenario("Timing test")
			.steps(
				given(makeOp("createUser", { name: "Timed" })).as("user"),
			);

		const result = await runScenario(s, config);

		expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
		expect(result.steps[0]!.durationMs).toBeGreaterThanOrEqual(0);
	});

	test("empty scenario passes", async () => {
		const s = scenario("Empty").steps();

		const result = await runScenario(s, config);

		expect(result.passed).toBe(true);
		expect(result.steps).toHaveLength(0);
	});
});

describe("createRunner", () => {
	test("runAll executes multiple scenarios", async () => {
		const runner = createRunner(config);

		const scenarios = [
			scenario("S1").steps(given(makeOp("createUser", { name: "A" })).as("u")),
			scenario("S2").steps(given(makeOp("createUser", { name: "B" })).as("u")),
		];

		const result = await runner.runAll(scenarios);

		expect(result.passed).toBe(2);
		expect(result.failed).toBe(0);
		expect(result.results).toHaveLength(2);
	});

	test("runAll calls reset between scenarios", async () => {
		let resetCount = 0;
		const runner = createRunner(config, {
			reset: () => { resetCount++; },
		});

		const scenarios = [
			scenario("S1").steps(given(makeOp("noop", {})).step),
			scenario("S2").steps(given(makeOp("noop", {})).step),
			scenario("S3").steps(given(makeOp("noop", {})).step),
		];

		await runner.runAll(scenarios);

		// Reset called between scenarios (not before first)
		expect(resetCount).toBe(2);
	});

	test("runAll calls cleanup after all scenarios", async () => {
		let cleaned = false;
		const runner = createRunner(config, {
			cleanup: () => { cleaned = true; },
		});

		await runner.runAll([
			scenario("S1").steps(given(makeOp("noop", {})).step),
		]);

		expect(cleaned).toBe(true);
	});

	test("runAll filters by tags", async () => {
		const runner = createRunner(config);

		const scenarios = [
			scenario("Tagged").withTags("smoke").steps(given(makeOp("noop", {})).step),
			scenario("Untagged").steps(given(makeOp("noop", {})).step),
		];

		const result = await runner.runAll(scenarios, { tags: ["smoke"] });

		expect(result.results).toHaveLength(1);
		expect(result.skipped).toBe(1);
		expect(result.results[0]!.scenarioName).toBe("Tagged");
	});
});
