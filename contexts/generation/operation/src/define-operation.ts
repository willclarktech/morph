import type * as S from "effect/Schema";

/**
 * Brand symbol for identifying operation definitions.
 */
export const OPERATION_BRAND = Symbol.for("@morphdsl/operation");

/**
 * Full operation definition including Effect Schema for validation.
 * This type uses Effect Schema constraints and can't be generated from JSON schema.
 */
export interface OperationDefinition<
	ParametersSchema extends S.Schema.All,
	OptionsSchema extends S.Schema.All,
	R,
> {
	readonly description?: string;
	readonly execute: (
		params: S.Schema.Type<ParametersSchema>,
		options: S.Schema.Type<OptionsSchema>,
	) => R;
	readonly name: string;
	readonly [OPERATION_BRAND]: true;
	readonly options: OptionsSchema;
	readonly params: ParametersSchema;
}

/**
 * Define a full operation with Effect Schema validation.
 */
export const defineOperation = <
	ParametersSchema extends S.Schema.All,
	OptionsSchema extends S.Schema.All,
	R,
>(
	definition: Omit<
		OperationDefinition<ParametersSchema, OptionsSchema, R>,
		typeof OPERATION_BRAND
	>,
): OperationDefinition<ParametersSchema, OptionsSchema, R> => ({
	[OPERATION_BRAND]: true,
	...definition,
});
