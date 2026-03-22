/**
 * Primitive type and TypeRef schemas.
 */
import { Schema as S } from "effect";

// =============================================================================
// Type Interfaces (defined first for recursive types)
// =============================================================================

interface ArrayTypeReference {
	readonly element: TypeRef;
	readonly kind: "array";
}

interface EntityIdTypeReference {
	readonly context?: string;
	readonly entity: string;
	readonly kind: "entityId";
}

interface GenericTypeReference {
	readonly args: readonly TypeRef[];
	readonly context?: string;
	readonly kind: "generic";
	readonly name: string;
}

interface EntityTypeReference {
	readonly context?: string;
	readonly kind: "entity";
	readonly name: string;
}

interface OptionalTypeReference {
	readonly inner: TypeRef;
	readonly kind: "optional";
}

interface PrimitiveTypeReference {
	readonly kind: "primitive";
	readonly name:
		| "boolean"
		| "date"
		| "datetime"
		| "float"
		| "integer"
		| "string"
		| "unknown"
		| "void";
}

interface TypeParamReference {
	readonly kind: "typeParam";
	readonly name: string;
}

interface TypeTypeReference {
	readonly context?: string;
	readonly kind: "type";
	readonly name: string;
}

interface UnionTypeReference {
	readonly kind: "union";
	readonly values: readonly string[];
}

interface ValueObjectTypeReference {
	readonly context?: string;
	readonly kind: "valueObject";
	readonly name: string;
}

interface FunctionParamDef {
	readonly name: string;
	readonly type: TypeRef;
}

interface FunctionTypeReference {
	readonly kind: "function";
	readonly params: readonly FunctionParamDef[];
	readonly returns: TypeRef;
}

type TypeRef =
	| ArrayTypeReference
	| EntityIdTypeReference
	| EntityTypeReference
	| FunctionTypeReference
	| GenericTypeReference
	| OptionalTypeReference
	| PrimitiveTypeReference
	| TypeParamReference
	| TypeTypeReference
	| UnionTypeReference
	| ValueObjectTypeReference;

// =============================================================================
// Simple Type Schemas
// =============================================================================

export const PrimitiveTypeReferenceSchema = S.Struct({
	kind: S.Literal("primitive"),
	name: S.Literal(
		"boolean",
		"date",
		"datetime",
		"float",
		"integer",
		"string",
		"unknown",
		"void",
	),
});

export const TypeParamReferenceSchema = S.Struct({
	kind: S.Literal("typeParam"),
	name: S.String,
});

export const EntityIdTypeReferenceSchema = S.Struct({
	context: S.optionalWith(S.String, { exact: true }),
	entity: S.String,
	kind: S.Literal("entityId"),
});

export const EntityTypeReferenceSchema = S.Struct({
	context: S.optionalWith(S.String, { exact: true }),
	kind: S.Literal("entity"),
	name: S.String,
});

export const UnionTypeReferenceSchema = S.Struct({
	kind: S.Literal("union"),
	values: S.Array(S.String),
});

export const TypeTypeReferenceSchema = S.Struct({
	context: S.optionalWith(S.String, { exact: true }),
	kind: S.Literal("type"),
	name: S.String,
});

export const ValueObjectTypeReferenceSchema = S.Struct({
	context: S.optionalWith(S.String, { exact: true }),
	kind: S.Literal("valueObject"),
	name: S.String,
});

// =============================================================================
// Recursive TypeRef Schema
// =============================================================================

export const ArrayTypeReferenceSchema: S.Schema<ArrayTypeReference> = S.Struct({
	element: S.suspend((): S.Schema<TypeRef> => TypeRefSchema),
	kind: S.Literal("array"),
});

export const OptionalTypeReferenceSchema: S.Schema<OptionalTypeReference> =
	S.Struct({
		inner: S.suspend((): S.Schema<TypeRef> => TypeRefSchema),
		kind: S.Literal("optional"),
	});

export const GenericTypeReferenceSchema: S.Schema<GenericTypeReference> =
	S.Struct({
		args: S.Array(S.suspend((): S.Schema<TypeRef> => TypeRefSchema)),
		context: S.optionalWith(S.String, { exact: true }),
		kind: S.Literal("generic"),
		name: S.String,
	});

export const FunctionParamDefSchema: S.Schema<FunctionParamDef> = S.Struct({
	name: S.String,
	type: S.suspend((): S.Schema<TypeRef> => TypeRefSchema),
});

export const FunctionTypeReferenceSchema: S.Schema<FunctionTypeReference> =
	S.Struct({
		kind: S.Literal("function"),
		params: S.Array(FunctionParamDefSchema),
		returns: S.suspend((): S.Schema<TypeRef> => TypeRefSchema),
	});

export const TypeRefSchema: S.Schema<TypeRef> = S.Union(
	PrimitiveTypeReferenceSchema,
	TypeParamReferenceSchema,
	EntityIdTypeReferenceSchema,
	EntityTypeReferenceSchema,
	TypeTypeReferenceSchema,
	UnionTypeReferenceSchema,
	ValueObjectTypeReferenceSchema,
	ArrayTypeReferenceSchema,
	OptionalTypeReferenceSchema,
	GenericTypeReferenceSchema,
	FunctionTypeReferenceSchema,
).annotations({ identifier: "TypeRef" });

// Re-export types for TypeRef union members
export type {
	ArrayTypeReference,
	EntityIdTypeReference,
	EntityTypeReference,
	FunctionParamDef,
	FunctionTypeReference,
	GenericTypeReference,
	OptionalTypeReference,
	PrimitiveTypeReference,
	TypeParamReference,
	TypeRef,
	TypeTypeReference,
	UnionTypeReference,
	ValueObjectTypeReference,
};

// =============================================================================
// Constraints
// =============================================================================

export const NonEmptyConstraintSchema = S.Struct({
	kind: S.Literal("nonEmpty"),
});

export const PositiveConstraintSchema = S.Struct({
	kind: S.Literal("positive"),
});

export const PatternConstraintSchema = S.Struct({
	kind: S.Literal("pattern"),
	regex: S.String,
});

export const RangeConstraintSchema = S.Struct({
	kind: S.Literal("range"),
	max: S.optionalWith(S.Number, { exact: true }),
	min: S.optionalWith(S.Number, { exact: true }),
});

export const CustomConstraintSchema = S.Struct({
	description: S.String,
	kind: S.Literal("custom"),
	name: S.String,
});

export const UniqueConstraintSchema = S.Struct({
	kind: S.Literal("unique"),
});

export const ConstraintDefSchema = S.Union(
	NonEmptyConstraintSchema,
	PositiveConstraintSchema,
	PatternConstraintSchema,
	RangeConstraintSchema,
	CustomConstraintSchema,
	UniqueConstraintSchema,
);

export type ConstraintDef = S.Schema.Type<typeof ConstraintDefSchema>;
export type CustomConstraint = S.Schema.Type<typeof CustomConstraintSchema>;
export type NonEmptyConstraint = S.Schema.Type<typeof NonEmptyConstraintSchema>;
export type PatternConstraint = S.Schema.Type<typeof PatternConstraintSchema>;
export type PositiveConstraint = S.Schema.Type<typeof PositiveConstraintSchema>;
export type RangeConstraint = S.Schema.Type<typeof RangeConstraintSchema>;
export type UniqueConstraint = S.Schema.Type<typeof UniqueConstraintSchema>;
