/**
 * Type definitions for DSL operations.
 * These match the schema-generated types in operation-dsl/schemas.ts.
 * Both are exported for compatibility - they're structurally identical.
 */

/**
 * An operation call in the DSL.
 * This is a data structure representing an operation invocation
 * without actually executing it.
 */
export interface OperationCall<TParameters, _TResult> {
	readonly _tag: "OperationCall";
	readonly name: string;
	readonly params: TParameters;
}

/**
 * Definition for a DSL operation.
 * Contains the factory function for creating operation calls.
 */
export interface OperationDef<TParameters, TResult> {
	readonly call: (params: TParameters) => OperationCall<TParameters, TResult>;
	readonly name: string;
}

/**
 * Prose type for human-readable operation descriptions.
 * Keys are operation names, values are template strings.
 *
 * Template syntax:
 * - {paramName} - placeholder for param value
 * - [paramName? text] - conditional, shown only if param is truthy
 * - {actor} - replaced with scenario actor if present
 * - {$binding.field} - reference to a bound value from a previous step (runtime only)
 */
export type Prose<Ops extends Record<string, { name: string }>> = {
	readonly [K in keyof Ops]?: string;
};

/**
 * Define a DSL operation.
 * Returns an operation definition with a call factory.
 *
 * @example
 * ```ts
 * const createUser = defineOp<{ email: string; name: string }, User>("createUser");
 *
 * // Usage:
 * createUser.call({ email: "test@example.com", name: "Alice" })
 * ```
 */
export const defineOp = <TParameters, TResult>(
	name: string,
): OperationDef<TParameters, TResult> => ({
	call: (params: TParameters): OperationCall<TParameters, TResult> => ({
		_tag: "OperationCall",
		name,
		params,
	}),
	name,
});
