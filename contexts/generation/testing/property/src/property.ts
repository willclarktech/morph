import type * as fc from "fast-check";

/**
 * Base property suite definition.
 * Runner-agnostic description of a property test.
 */
export interface PropertySuite<Input = unknown, Context = void> {
	readonly _tag: "PropertySuite";
	readonly arbitrary: fc.Arbitrary<Input>;
	readonly contextArbitrary?: fc.Arbitrary<Context> | undefined;
	readonly description: string;
	readonly name: string;
}

/**
 * Property suite for testing operation invariants.
 * Tests that operation execution respects invariants.
 */
export interface OperationPropertySuite<
	Input = unknown,
	Output = unknown,
	Context = void,
> extends PropertySuite<Input, Context> {
	/** Name of the operation to test */
	readonly operationName: string;
	/** Predicate checks output against expected invariant */
	readonly predicate: (
		input: Input,
		output: Output,
		context: Context,
	) => boolean;
	readonly suiteType: "operation";
	/** Transform input to operation params */
	readonly toParams: (input: Input, context: Context) => unknown;
}

/**
 * Property suite for testing validator/guard functions.
 * Tests that validators correctly implement predicates.
 */
export interface ValidatorPropertySuite<
	Input = unknown,
	Context = void,
> extends PropertySuite<Input, Context> {
	/** Expected predicate - validator should pass iff this returns true */
	readonly predicate: (input: Input, context: Context) => boolean;
	readonly suiteType: "validator";
	/** Name of the validator function to test */
	readonly validatorName: string;
}

/**
 * Property suite for testing algebraic contract laws on port interfaces.
 * Each law is an effectful predicate that runs against a fresh port instance.
 */
export interface ContractPropertySuite<
	Input = unknown,
> extends PropertySuite<Input> {
	readonly law: (input: Input) => Promise<boolean>;
	readonly port: string;
	readonly suiteType: "contract";
}

/**
 * Union type for all property suite types.
 */
export type AnyPropertySuite =
	| ContractPropertySuite
	| OperationPropertySuite<unknown, unknown, unknown>
	| ValidatorPropertySuite<unknown, unknown>;

/**
 * Create a validator property suite.
 *
 * @example
 * ```ts
 * const todoBelongsToUser = validatorProperty({
 *   name: "TodoBelongsToUser",
 *   description: "Every todo must belong to exactly one user",
 *   arbitrary: TodoArbitrary,
 *   contextArbitrary: fc.record({ users: fc.array(UserArbitrary) }),
 *   validatorName: "validateTodoBelongsToUser",
 *   predicate: (todo, context) =>
 *     context.users.some(u => u.id === todo.userId),
 * });
 * ```
 */
export const validatorProperty = <Input, Context = void>(config: {
	readonly arbitrary: fc.Arbitrary<Input>;
	readonly contextArbitrary?: fc.Arbitrary<Context>;
	readonly description: string;
	readonly name: string;
	readonly predicate: (input: Input, context: Context) => boolean;
	readonly validatorName: string;
}): ValidatorPropertySuite<Input, Context> => ({
	_tag: "PropertySuite",
	arbitrary: config.arbitrary,
	contextArbitrary: config.contextArbitrary,
	description: config.description,
	name: config.name,
	predicate: config.predicate,
	suiteType: "validator",
	validatorName: config.validatorName,
});

/**
 * Create an operation property suite.
 *
 * @example
 * ```ts
 * const createTodoReturnsValidTodo = operationProperty({
 *   name: "CreateTodoReturnsValidTodo",
 *   description: "Created todos always have valid IDs",
 *   arbitrary: fc.record({ title: fc.string(), userId: UserIdArbitrary }),
 *   operationName: "createTodo",
 *   toParams: (input) => input,
 *   predicate: (input, output) =>
 *     typeof output.id === "string" && output.userId === input.userId,
 * });
 * ```
 */
export const operationProperty = <Input, Output, Context = void>(config: {
	readonly arbitrary: fc.Arbitrary<Input>;
	readonly contextArbitrary?: fc.Arbitrary<Context>;
	readonly description: string;
	readonly name: string;
	readonly operationName: string;
	readonly predicate: (
		input: Input,
		output: Output,
		context: Context,
	) => boolean;
	readonly toParams: (input: Input, context: Context) => unknown;
}): OperationPropertySuite<Input, Output, Context> => ({
	_tag: "PropertySuite",
	arbitrary: config.arbitrary,
	contextArbitrary: config.contextArbitrary,
	description: config.description,
	name: config.name,
	operationName: config.operationName,
	predicate: config.predicate,
	suiteType: "operation",
	toParams: config.toParams,
});

/**
 * Create a contract property suite for testing algebraic laws on a port.
 */
export const contractProperty = <Input>(config: {
	readonly arbitrary: fc.Arbitrary<Input>;
	readonly description: string;
	readonly law: (input: Input) => Promise<boolean>;
	readonly name: string;
	readonly port: string;
}): ContractPropertySuite<Input> => ({
	_tag: "PropertySuite",
	arbitrary: config.arbitrary,
	description: config.description,
	law: config.law,
	name: config.name,
	port: config.port,
	suiteType: "contract",
});

export const isContractSuite = (
	suite: AnyPropertySuite,
): suite is ContractPropertySuite => suite.suiteType === "contract";
