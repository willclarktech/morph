/**
 * EntityDef, AttributeDef, and related schemas.
 */
import { Schema as S } from "effect";

import { ConstraintDefSchema, TypeRefSchema } from "./primitives";

// =============================================================================
// Attributes & Relationships
// =============================================================================

export const AttributeDefSchema = S.Struct({
	constraints: S.optionalWith(S.Array(ConstraintDefSchema), { exact: true }),
	description: S.String,
	optional: S.optionalWith(S.Boolean, { exact: true }),
	sensitive: S.optionalWith(S.Boolean, { exact: true }),
	type: TypeRefSchema,
});

export type AttributeDef = S.Schema.Type<typeof AttributeDefSchema>;

export const RelationshipDefSchema = S.Struct({
	description: S.String,
	inverse: S.optionalWith(S.String, { exact: true }),
	kind: S.Literal("belongs_to", "has_many", "has_one", "references"),
	target: S.String,
});

export type RelationshipDef = S.Schema.Type<typeof RelationshipDefSchema>;

// =============================================================================
// Aggregates
// =============================================================================

export const AggregateDefSchema = S.Struct({
	cascadeDelete: S.optionalWith(S.Boolean, { exact: true }),
	parent: S.optionalWith(S.String, { exact: true }),
	root: S.Boolean,
});

export type AggregateDef = S.Schema.Type<typeof AggregateDefSchema>;

// =============================================================================
// Entities
// =============================================================================

export const EntityDefSchema = S.Struct({
	aggregate: S.optionalWith(AggregateDefSchema, { exact: true }),
	attributes: S.Record({ key: S.String, value: AttributeDefSchema }),
	description: S.String,
	relationships: S.optionalWith(S.Array(RelationshipDefSchema), {
		exact: true,
		default: () => [],
	}),
});

export type EntityDef = S.Schema.Type<typeof EntityDefSchema>;

// =============================================================================
// Value Objects
// =============================================================================

export const ValueObjectDefSchema = S.Struct({
	attributes: S.Record({ key: S.String, value: AttributeDefSchema }),
	description: S.String,
});

export type ValueObjectDef = S.Schema.Type<typeof ValueObjectDefSchema>;

// =============================================================================
// Pure Types (for transformation-centric domains)
// =============================================================================

/**
 * TypeParameterDef: A type parameter for generic types.
 * Used to define generic type parameters like T, TResult, etc.
 * Supports constraints (`T extends Base`) and defaults (`T = unknown`).
 */
export const TypeParameterDefSchema = S.Struct({
	constraint: S.optionalWith(TypeRefSchema, { exact: true }),
	default: S.optionalWith(TypeRefSchema, { exact: true }),
	name: S.String,
});

export type TypeParameterDef = S.Schema.Type<typeof TypeParameterDefSchema>;

/**
 * FieldDef: A field in a product or sum type.
 * Simpler than AttributeDef - no constraints, just type and description.
 */
export const FieldDefSchema = S.Struct({
	description: S.String,
	optional: S.optionalWith(S.Boolean, { exact: true }),
	type: TypeRefSchema,
});

export type FieldDef = S.Schema.Type<typeof FieldDefSchema>;

/**
 * VariantDef: A variant in a sum type (discriminated union).
 * Each variant can have optional fields.
 */
export const VariantDefSchema = S.Struct({
	description: S.String,
	fields: S.optionalWith(S.Record({ key: S.String, value: FieldDefSchema }), {
		exact: true,
	}),
});

export type VariantDef = S.Schema.Type<typeof VariantDefSchema>;

/**
 * ProductTypeDef: A record/struct type with named fields.
 * Can be generic via optional typeParameters.
 */
export const ProductTypeDefSchema = S.Struct({
	description: S.String,
	fields: S.Record({ key: S.String, value: FieldDefSchema }),
	kind: S.Literal("product"),
	typeParameters: S.optionalWith(S.Array(TypeParameterDefSchema), {
		exact: true,
	}),
});

export type ProductTypeDef = S.Schema.Type<typeof ProductTypeDefSchema>;

/**
 * SumTypeDef: A discriminated union with named variants.
 * The discriminator field specifies the tag name (defaults to "kind").
 * Can be generic via optional typeParameters.
 */
export const SumTypeDefSchema = S.Struct({
	description: S.String,
	discriminator: S.String,
	kind: S.Literal("sum"),
	typeParameters: S.optionalWith(S.Array(TypeParameterDefSchema), {
		exact: true,
	}),
	variants: S.Record({ key: S.String, value: VariantDefSchema }),
});

export type SumTypeDef = S.Schema.Type<typeof SumTypeDefSchema>;

/**
 * AliasTypeDef: A type alias that wraps another type.
 * Can be generic via optional typeParameters.
 */
export const AliasTypeDefSchema = S.Struct({
	description: S.String,
	kind: S.Literal("alias"),
	type: TypeRefSchema,
	typeParameters: S.optionalWith(S.Array(TypeParameterDefSchema), {
		exact: true,
	}),
});

export type AliasTypeDef = S.Schema.Type<typeof AliasTypeDefSchema>;

/**
 * TypeDef: Union of all pure algebraic type definitions.
 * Used for transformation-centric domains (pure functions, no entities).
 */
export const TypeDefSchema = S.Union(
	ProductTypeDefSchema,
	SumTypeDefSchema,
	AliasTypeDefSchema,
);

export type TypeDef = S.Schema.Type<typeof TypeDefSchema>;
