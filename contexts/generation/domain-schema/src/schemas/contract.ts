import { Schema as S } from "effect";

import type { ConditionExpr } from "./expressions/condition-expr";
import type { ValueExpr } from "./expressions/value-expr";

import { ConditionExprSchema } from "./expressions/condition-expr";
import { ValueExprSchema } from "./expressions/value-expr";

// =============================================================================
// Type Interfaces
// =============================================================================

interface ContractBindingDef {
	readonly name: string;
	readonly type: string;
}

interface ContractStepDef {
	readonly args: readonly ValueExpr[];
	readonly method: string;
}

interface ContractDef {
	readonly after: readonly ContractStepDef[];
	readonly bindings: readonly ContractBindingDef[];
	readonly description: string;
	readonly name: string;
	readonly port: string;
	readonly then: ConditionExpr;
}

// =============================================================================
// Schemas
// =============================================================================

export const ContractBindingDefSchema = S.Struct({
	name: S.String,
	type: S.String,
});

export const ContractStepDefSchema: S.Schema<ContractStepDef> = S.Struct({
	args: S.Array(S.suspend((): S.Schema<ValueExpr> => ValueExprSchema)),
	method: S.String,
});

export const ContractDefSchema: S.Schema<ContractDef> = S.Struct({
	after: S.Array(ContractStepDefSchema),
	bindings: S.Array(ContractBindingDefSchema),
	description: S.String,
	name: S.String,
	port: S.String,
	then: S.suspend((): S.Schema<ConditionExpr> => ConditionExprSchema),
});

// =============================================================================
// Type Exports
// =============================================================================

export type { ContractBindingDef, ContractDef, ContractStepDef };
