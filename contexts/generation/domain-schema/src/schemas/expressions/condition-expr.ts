/**
 * Condition Expression Schemas
 *
 * Condition expressions represent boolean conditions in invariants:
 * comparisons, logical operations, and quantifiers.
 */
import { Schema as S } from "effect";

import type { ValueExpr } from "./value-expr";

import { ValueExprSchema } from "./value-expr";

// =============================================================================
// Type Interfaces (needed for recursive schema typing)
// =============================================================================

interface AndExpr {
	readonly conditions: readonly ConditionExpr[];
	readonly kind: "and";
}

interface ContainsExpr {
	readonly collection: ValueExpr;
	readonly kind: "contains";
	readonly value: ValueExpr;
}

type ConditionExpr =
	| AndExpr
	| ContainsExpr
	| EqualsExpr
	| ExistsExpr
	| ForAllExpr
	| GreaterThanExpr
	| GreaterThanOrEqualExpr
	| ImpliesExpr
	| LessThanExpr
	| LessThanOrEqualExpr
	| NotEqualsExpr
	| NotExpr
	| OrExpr;

interface EqualsExpr {
	readonly kind: "equals";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface ExistsExpr {
	readonly collection: ValueExpr;
	readonly condition: ConditionExpr;
	readonly kind: "exists";
	readonly variable: string;
}

interface ForAllExpr {
	readonly collection: ValueExpr;
	readonly condition: ConditionExpr;
	readonly kind: "forAll";
	readonly variable: string;
}

interface GreaterThanExpr {
	readonly kind: "greaterThan";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface GreaterThanOrEqualExpr {
	readonly kind: "greaterThanOrEqual";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface ImpliesExpr {
	readonly if: ConditionExpr;
	readonly kind: "implies";
	readonly then: ConditionExpr;
}

interface LessThanExpr {
	readonly kind: "lessThan";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface LessThanOrEqualExpr {
	readonly kind: "lessThanOrEqual";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface NotEqualsExpr {
	readonly kind: "notEquals";
	readonly left: ValueExpr;
	readonly right: ValueExpr;
}

interface NotExpr {
	readonly condition: ConditionExpr;
	readonly kind: "not";
}

interface OrExpr {
	readonly conditions: readonly ConditionExpr[];
	readonly kind: "or";
}

// =============================================================================
// Schemas
// =============================================================================

export const EqualsExprSchema: S.Schema<EqualsExpr> = S.Struct({
	kind: S.Literal("equals"),
	left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
});

export const NotEqualsExprSchema: S.Schema<NotEqualsExpr> = S.Struct({
	kind: S.Literal("notEquals"),
	left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
});

export const NotExprSchema: S.Schema<NotExpr> = S.Struct({
	condition: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	kind: S.Literal("not"),
});

export const AndExprSchema: S.Schema<AndExpr> = S.Struct({
	conditions: S.Array(
		S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	),
	kind: S.Literal("and"),
});

export const OrExprSchema: S.Schema<OrExpr> = S.Struct({
	conditions: S.Array(
		S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	),
	kind: S.Literal("or"),
});

export const ImpliesExprSchema: S.Schema<ImpliesExpr> = S.Struct({
	if: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	kind: S.Literal("implies"),
	then: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
});

export const ExistsExprSchema: S.Schema<ExistsExpr> = S.Struct({
	collection: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	condition: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	kind: S.Literal("exists"),
	variable: S.String,
});

export const ForAllExprSchema: S.Schema<ForAllExpr> = S.Struct({
	collection: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	condition: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
	kind: S.Literal("forAll"),
	variable: S.String,
});

export const GreaterThanExprSchema: S.Schema<GreaterThanExpr> = S.Struct({
	kind: S.Literal("greaterThan"),
	left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
});

export const GreaterThanOrEqualExprSchema: S.Schema<GreaterThanOrEqualExpr> =
	S.Struct({
		kind: S.Literal("greaterThanOrEqual"),
		left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
		right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	});

export const LessThanExprSchema: S.Schema<LessThanExpr> = S.Struct({
	kind: S.Literal("lessThan"),
	left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
});

export const LessThanOrEqualExprSchema: S.Schema<LessThanOrEqualExpr> =
	S.Struct({
		kind: S.Literal("lessThanOrEqual"),
		left: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
		right: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	});

export const ContainsExprSchema: S.Schema<ContainsExpr> = S.Struct({
	collection: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
	kind: S.Literal("contains"),
	value: S.suspend((): S.Schema<ValueExpr> => ValueExprSchema),
});

export const ConditionExprSchema: S.Schema<ConditionExpr> = S.Union(
	EqualsExprSchema,
	NotEqualsExprSchema,
	GreaterThanExprSchema,
	GreaterThanOrEqualExprSchema,
	LessThanExprSchema,
	LessThanOrEqualExprSchema,
	ContainsExprSchema,
	NotExprSchema,
	AndExprSchema,
	OrExprSchema,
	ImpliesExprSchema,
	ExistsExprSchema,
	ForAllExprSchema,
).annotations({ identifier: "ConditionExpr" });

// =============================================================================
// Type Exports
// =============================================================================

export type {
	AndExpr,
	ConditionExpr,
	ContainsExpr,
	EqualsExpr,
	ExistsExpr,
	ForAllExpr,
	GreaterThanExpr,
	GreaterThanOrEqualExpr,
	ImpliesExpr,
	LessThanExpr,
	LessThanOrEqualExpr,
	NotEqualsExpr,
	NotExpr,
	OrExpr,
};
