/**
 * Invariant Scope and Definition Schemas
 *
 * Scopes define where an invariant applies (global, entity, operation, etc.)
 * and InvariantDef combines scope with condition to form complete invariants.
 */
import { Schema as S } from "effect";

import { ConditionExprSchema } from "./condition-expr";

// =============================================================================
// Scope Schemas
// =============================================================================

export const GlobalScopeSchema = S.Struct({
	kind: S.Literal("global"),
});

export const EntityScopeSchema = S.Struct({
	entity: S.String,
	kind: S.Literal("entity"),
});

export const AggregateScopeSchema = S.Struct({
	kind: S.Literal("aggregate"),
	root: S.String,
});

export const OperationScopeSchema = S.Struct({
	kind: S.Literal("operation"),
	operation: S.String,
	when: S.Literal("pre", "post"),
});

export const ContextScopeSchema = S.Struct({
	kind: S.Literal("context"),
});

export const InvariantScopeSchema = S.Union(
	GlobalScopeSchema,
	EntityScopeSchema,
	AggregateScopeSchema,
	OperationScopeSchema,
	ContextScopeSchema,
);

// =============================================================================
// Type Exports
// =============================================================================

export type AggregateScope = S.Schema.Type<typeof AggregateScopeSchema>;
/** @public */
export type ContextScope = S.Schema.Type<typeof ContextScopeSchema>;
export type EntityScope = S.Schema.Type<typeof EntityScopeSchema>;
export type GlobalScope = S.Schema.Type<typeof GlobalScopeSchema>;
export type InvariantScope = S.Schema.Type<typeof InvariantScopeSchema>;
export type OperationScope = S.Schema.Type<typeof OperationScopeSchema>;

// =============================================================================
// Invariant Definition
// =============================================================================

export const InvariantDefSchema = S.Struct({
	condition: ConditionExprSchema,
	description: S.String,
	name: S.String,
	scope: InvariantScopeSchema,
	violation: S.String,
});

export type InvariantDef = S.Schema.Type<typeof InvariantDefSchema>;
