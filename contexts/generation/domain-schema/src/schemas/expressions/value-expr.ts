/**
 * Value Expression Schemas
 *
 * Value expressions represent data values in invariant conditions:
 * field references, literals, variables, and counts.
 */
import { Schema as S } from "effect";

// =============================================================================
// Type Interfaces (needed for recursive schema typing)
// =============================================================================

interface CallExpr {
	readonly args: readonly ValueExpr[];
	readonly field?: string;
	readonly kind: "call";
	readonly name: string;
}

interface CountExpr {
	readonly collection: ValueExpr;
	readonly kind: "count";
}

interface FieldExpr {
	readonly kind: "field";
	readonly path: string;
}

interface LiteralExpr {
	readonly kind: "literal";
	readonly value: unknown;
}

interface VariableExpr {
	readonly kind: "variable";
	readonly name: string;
}

type ValueExpr = CallExpr | CountExpr | FieldExpr | LiteralExpr | VariableExpr;

// =============================================================================
// Schemas
// =============================================================================

export const FieldExprSchema = S.Struct({
	kind: S.Literal("field"),
	path: S.String,
});

export const LiteralExprSchema = S.Struct({
	kind: S.Literal("literal"),
	value: S.Unknown,
});

export const VariableExprSchema = S.Struct({
	kind: S.Literal("variable"),
	name: S.String,
});

export const CallExprSchema: S.Schema<CallExpr> = S.Struct({
	args: S.Array(S.suspend((): S.Schema<ValueExpr> => ValueExprSchema)),
	field: S.optionalWith(S.String, { exact: true }),
	kind: S.Literal("call"),
	name: S.String,
});

export const CountExprSchema: S.Schema<CountExpr> = S.Struct({
	collection: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	kind: S.Literal("count"),
});

export const ValueExprSchema: S.Schema<ValueExpr> = S.Union(
	FieldExprSchema,
	LiteralExprSchema,
	VariableExprSchema,
	CountExprSchema,
	CallExprSchema,
).annotations({ identifier: "ValueExpr" });

// =============================================================================
// Type Exports
// =============================================================================

export type {
	CallExpr,
	CountExpr,
	FieldExpr,
	LiteralExpr,
	ValueExpr,
	VariableExpr,
};
