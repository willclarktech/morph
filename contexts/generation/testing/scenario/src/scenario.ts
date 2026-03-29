import type { OperationCall } from "@morphdsl/operation";

/**
 * Assertion matchers.
 */
export type AssertionMatcher =
	| { readonly expected: number; readonly type: "toHaveLength" }
	| { readonly expected: unknown; readonly type: "toBe" }
	| { readonly expected: unknown; readonly type: "toContain" }
	| { readonly type: "toBeDefined" }
	| { readonly type: "toBeUndefined" };

/**
 * An assertion to verify expected outcomes.
 */
export interface Assertion {
	readonly _tag: "Assertion";
	readonly field: string | undefined;
	readonly matcher: AssertionMatcher;
	readonly prose?: string;
	readonly subject: string;
	readonly withProse: (prose: string) => Assertion;
}

/**
 * Assertion builder - provides matcher methods that return Assertion.
 */
export interface AssertionBuilder {
	readonly toBe: (expected: unknown) => Assertion;
	readonly toBeDefined: () => Assertion;
	readonly toBeUndefined: () => Assertion;
	readonly toContain: (expected: unknown) => Assertion;
	readonly toHaveLength: (expected: number) => Assertion;
}

/**
 * Step types for BDD scenarios.
 */
export type StepType = "given" | "then" | "when";

/**
 * A step in a scenario - wraps an operation call or assertion.
 */
export interface Step<TResult = unknown> {
	readonly _tag: "Step";
	readonly binding?: string;
	readonly operation: Assertion | OperationCall<unknown, TResult>;
	readonly type: StepType;
}

/**
 * Step builder for adding bindings.
 */
export interface StepBuilder<TResult> {
	readonly as: (binding: string) => Step<TResult>;
	readonly step: Step<TResult>;
}

/**
 * A complete scenario with metadata and steps.
 */
export interface Scenario {
	readonly actor: string | undefined;
	readonly name: string;
	readonly steps: readonly Step[];
	readonly tags: readonly string[];
}

/**
 * Builder for creating scenarios fluently.
 */
export interface ScenarioBuilder {
	readonly steps: (...steps: Step[]) => Scenario;
	readonly withActor: (actor: string) => ScenarioBuilder;
	readonly withTags: (...tags: string[]) => ScenarioBuilder;
}

/**
 * Create a new scenario.
 *
 * @example
 * ```ts
 * const myScenario = scenario("Create and complete a todo")
 *   .withActor("Taylor")
 *   .steps(
 *     given(createUser.call({ email: "taylor@test.com", name: "Taylor" })).as("user"),
 *     when(createTodo.call({ userId: ref("user").id, title: "Buy milk" })).as("todo"),
 *     when(completeTodo.call({ todoId: ref("todo").id })),
 *     then(assert("todo", "completed").toBe(true))
 *   );
 * ```
 */
export const scenario = (name: string): ScenarioBuilder => {
	let actor: string | undefined;
	let tags: string[] = [];

	const builder: ScenarioBuilder = {
		steps: (...steps: Step[]): Scenario => ({
			actor,
			name,
			steps,
			tags,
		}),
		withActor: (a: string) => {
			actor = a;
			return builder;
		},
		withTags: (...t: string[]) => {
			tags = t;
			return builder;
		},
	};

	return builder;
};

const createStepBuilder = <TResult>(
	step: Step<TResult>,
): StepBuilder<TResult> => ({
	as: (binding: string): Step<TResult> => ({
		...step,
		binding,
	}),
	step,
});

/**
 * Create a "given" step (precondition).
 */
export const given = <TParameters, TResult>(
	operation: OperationCall<TParameters, TResult>,
): StepBuilder<TResult> =>
	createStepBuilder({
		_tag: "Step",
		operation,
		type: "given",
	});

/**
 * Create a "when" step (action).
 */
export const when = <TParameters, TResult>(
	operation: OperationCall<TParameters, TResult>,
): StepBuilder<TResult> =>
	createStepBuilder({
		_tag: "Step",
		operation,
		type: "when",
	});

/**
 * Create a "then" step (assertion).
 */
export const then = (assertion: Assertion): Step<void> => ({
	_tag: "Step",
	operation: assertion,
	type: "then",
});

/**
 * Create a typed reference to a bound scenario value.
 * Returns a Proxy that produces `$binding.field` strings at runtime,
 * preserving type information at compile time.
 *
 * @example
 * ```ts
 * given(createUser.call({ email: "a@b.com", name: "Alice" })).as("admin"),
 * when(createPost.call({ authorId: ref<User>("admin").id }))
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is intentional: callers write ref<User>("admin").id for type-safe field access
export const ref = <T extends object>(binding: string): T =>
	new Proxy({} as T, {
		get: (_target, field: string) => `$${binding}.${field}`,
	});

/**
 * Create an assertion on a bound value.
 *
 * @param subject - The binding name to assert on (or "lastResult")
 * @param field - Optional field path to check
 *
 * @example
 * ```ts
 * assert("todo", "completed").toBe(true)
 * assert("todos").toHaveLength(2).withProse("two todos are returned")
 * ```
 */
export const assert = (subject: string, field?: string): AssertionBuilder => {
	const createAssertion = (
		matcher: AssertionMatcher,
		prose?: string,
	): Assertion => ({
		_tag: "Assertion",
		field,
		matcher,
		subject,
		...(prose !== undefined && { prose }),
		withProse: (newProse: string) => createAssertion(matcher, newProse),
	});

	return {
		toBe: (expected: unknown) => createAssertion({ expected, type: "toBe" }),
		toBeDefined: () => createAssertion({ type: "toBeDefined" }),
		toBeUndefined: () => createAssertion({ type: "toBeUndefined" }),
		toContain: (expected: unknown) =>
			createAssertion({ expected, type: "toContain" }),
		toHaveLength: (expected: number) =>
			createAssertion({ expected, type: "toHaveLength" }),
	};
};
