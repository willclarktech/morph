/**
 * CommandDef, QueryDef, FunctionDef, and related schemas.
 */
import { Schema as S } from "effect";

import { ExtensionsSchema } from "../extensions";
import { ContractDefSchema } from "./contract";
import {
	EntityDefSchema,
	FieldDefSchema,
	TypeDefSchema,
	TypeParameterDefSchema,
	ValueObjectDefSchema,
} from "./entities";
import { InvariantDefSchema } from "./expressions";
import { TypeRefSchema } from "./primitives";

// =============================================================================
// Emitted Events (inline on operations)
// =============================================================================

export const EmittedEventDefSchema = S.Struct({
	description: S.String,
	name: S.String,
});

export type EmittedEventDef = S.Schema.Type<typeof EmittedEventDefSchema>;

// =============================================================================
// Aggregate References (for operation dependencies)
// =============================================================================

export const AggregateRefSchema = S.Struct({
	access: S.Literal("read", "write"),
	aggregate: S.String,
});

export type AggregateRef = S.Schema.Type<typeof AggregateRefSchema>;

// =============================================================================
// Subscribers
// =============================================================================

export const SubscriberDefSchema = S.Struct({
	description: S.String,
	events: S.Array(S.String),
});

export type SubscriberDef = S.Schema.Type<typeof SubscriberDefSchema>;

// =============================================================================
// Operations (Commands and Queries)
// =============================================================================

export const ErrorDefSchema = S.Struct({
	description: S.String,
	name: S.String,
	when: S.String,
});

export type ErrorDef = S.Schema.Type<typeof ErrorDefSchema>;

// =============================================================================
// Context-Level Errors (with typed fields)
// =============================================================================

/**
 * ErrorFieldDef: A field in a context-level error.
 * Similar to FieldDef but with optional flag.
 */
export const ErrorFieldDefSchema = S.Struct({
	description: S.optionalWith(S.String, { exact: true }),
	optional: S.optionalWith(S.Boolean, { exact: true }),
	type: TypeRefSchema,
});

export type ErrorFieldDef = S.Schema.Type<typeof ErrorFieldDefSchema>;

/**
 * ContextErrorDef: Error defined at the context level with typed fields.
 * These errors can be shared across operations and have structured data.
 */
export const ContextErrorDefSchema = S.Struct({
	description: S.String,
	fields: S.Record({ key: S.String, value: ErrorFieldDefSchema }),
});

export type ContextErrorDef = S.Schema.Type<typeof ContextErrorDefSchema>;

// =============================================================================
// Ports (DI Contracts)
// =============================================================================

/**
 * PortMethodDef: A method on a port (DI contract).
 * Methods return Effects and can reference type parameters.
 */
export const PortMethodDefSchema = S.Struct({
	description: S.String,
	errors: S.optionalWith(S.Array(S.String), { exact: true, default: () => [] }),
	params: S.Record({ key: S.String, value: FieldDefSchema }),
	returns: TypeRefSchema,
});

export type PortMethodDef = S.Schema.Type<typeof PortMethodDefSchema>;

/**
 * PortDef: A port (DI contract) that defines a service interface.
 * Ports are from hexagonal architecture - they define what a service looks like.
 * Implementations are provided by adapters in impls/.
 */
export const PortDefSchema = S.Struct({
	description: S.String,
	methods: S.Record({ key: S.String, value: PortMethodDefSchema }),
	typeParameters: S.optionalWith(S.Array(TypeParameterDefSchema), {
		exact: true,
	}),
});

export type PortDef = S.Schema.Type<typeof PortDefSchema>;

// =============================================================================
// Parameters
// =============================================================================

export const ParamDefSchema = S.Struct({
	default: S.optionalWith(S.Unknown, { exact: true }),
	description: S.String,
	optional: S.optionalWith(S.Boolean, { exact: true }),
	sensitive: S.optionalWith(S.Boolean, { exact: true }),
	type: TypeRefSchema,
});

export type ParamDef = S.Schema.Type<typeof ParamDefSchema>;

/**
 * Command: State-changing operation that emits an event.
 * Commands modify the system and produce domain events.
 */
export const CommandDefSchema = S.Struct({
	description: S.String,
	emits: S.Array(EmittedEventDefSchema).pipe(S.minItems(1)),
	errors: S.optionalWith(S.Array(ErrorDefSchema), {
		exact: true,
		default: () => [],
	}),
	input: S.Record({ key: S.String, value: ParamDefSchema }),
	output: TypeRefSchema,
	post: S.optionalWith(S.Array(S.String), { exact: true }),
	pre: S.optionalWith(S.Array(S.String), { exact: true }),
	tags: S.optionalWith(S.Array(S.String), { exact: true, default: () => [] }),
	uses: S.Array(AggregateRefSchema),
});

export type CommandDef = S.Schema.Type<typeof CommandDefSchema>;

/**
 * Query: Read-only operation that returns data without side effects.
 * Queries do not emit events or modify state.
 */
export const QueryDefSchema = S.Struct({
	description: S.String,
	errors: S.optionalWith(S.Array(ErrorDefSchema), {
		exact: true,
		default: () => [],
	}),
	input: S.Record({ key: S.String, value: ParamDefSchema }),
	output: TypeRefSchema,
	pre: S.optionalWith(S.Array(S.String), { exact: true }),
	tags: S.optionalWith(S.Array(S.String), { exact: true, default: () => [] }),
	uses: S.Array(AggregateRefSchema),
});

export type QueryDef = S.Schema.Type<typeof QueryDefSchema>;

/**
 * Function: Pure transformation without side effects.
 * Functions do not emit events, access aggregates, or have pre/post conditions.
 * Used for transformation-centric domains (code generators, compilers, etc.).
 * Supports type parameters for generic functions.
 */
export const FunctionDefSchema = S.Struct({
	description: S.String,
	errors: S.optionalWith(S.Array(ErrorDefSchema), {
		exact: true,
		default: () => [],
	}),
	input: S.Record({ key: S.String, value: ParamDefSchema }),
	output: TypeRefSchema,
	tags: S.optionalWith(S.Array(S.String), { exact: true, default: () => [] }),
	typeParameters: S.optionalWith(S.Array(TypeParameterDefSchema), {
		exact: true,
	}),
});

export type FunctionDef = S.Schema.Type<typeof FunctionDefSchema>;

/**
 * OperationDef: Union of Command and Query for unified handling.
 * Use CommandDef or QueryDef for type-specific operations.
 */
export const OperationDefSchema = S.Union(CommandDefSchema, QueryDefSchema);

export type OperationDef = S.Schema.Type<typeof OperationDefSchema>;

// =============================================================================
// Contexts
// =============================================================================

export const ContextDefSchema = S.Struct({
	commands: S.optionalWith(
		S.Record({ key: S.String, value: CommandDefSchema }),
		{ exact: true, default: () => ({}) },
	),
	contracts: S.optionalWith(S.Array(ContractDefSchema), {
		exact: true,
		default: () => [],
	}),
	dependencies: S.optionalWith(S.Array(S.String), {
		exact: true,
		default: () => [],
	}),
	description: S.String,
	entities: S.Record({ key: S.String, value: EntityDefSchema }),
	errors: S.optionalWith(
		S.Record({ key: S.String, value: ContextErrorDefSchema }),
		{ exact: true },
	),
	functions: S.optionalWith(
		S.Record({ key: S.String, value: FunctionDefSchema }),
		{ exact: true },
	),
	invariants: S.optionalWith(S.Array(InvariantDefSchema), {
		exact: true,
		default: () => [],
	}),
	ports: S.optionalWith(S.Record({ key: S.String, value: PortDefSchema }), {
		exact: true,
	}),
	queries: S.optionalWith(S.Record({ key: S.String, value: QueryDefSchema }), {
		exact: true,
		default: () => ({}),
	}),
	subscribers: S.optionalWith(
		S.Record({ key: S.String, value: SubscriberDefSchema }),
		{ exact: true },
	),
	types: S.optionalWith(S.Record({ key: S.String, value: TypeDefSchema }), {
		exact: true,
	}),
	valueObjects: S.optionalWith(
		S.Record({ key: S.String, value: ValueObjectDefSchema }),
		{ exact: true },
	),
});

export type ContextDef = S.Schema.Type<typeof ContextDefSchema>;

// =============================================================================
// Context Include Reference (for unresolved schemas with $ref)
// =============================================================================

/**
 * ContextIncludeDef: Reference to an external context schema file.
 * The path is relative to the root schema file.
 */
export const ContextIncludeDefSchema = S.Struct({
	$ref: S.String,
});

export type ContextIncludeDef = S.Schema.Type<typeof ContextIncludeDefSchema>;

/**
 * ContextEntry: Either an inline context definition or a reference to an external file.
 * Used in UnresolvedDomainSchema for schemas that may contain $ref entries.
 */
export const ContextEntrySchema = S.Union(
	ContextDefSchema,
	ContextIncludeDefSchema,
);

export type ContextEntry = S.Schema.Type<typeof ContextEntrySchema>;

// =============================================================================
// Root Schema
// =============================================================================

/**
 * DomainSchema: The fully resolved schema type used throughout the codebase.
 * All contexts are fully defined (no $ref entries).
 */
export const DomainSchemaSchema = S.Struct({
	$schema: S.optionalWith(S.String, { exact: true }),
	author: S.optionalWith(S.String, { exact: true }),
	contexts: S.Record({ key: S.String, value: ContextDefSchema }),
	description: S.optionalWith(S.String, { exact: true }),
	extensions: S.optionalWith(ExtensionsSchema, { exact: true }),
	license: S.optionalWith(S.String, { exact: true }),
	name: S.String,
	npmScope: S.optionalWith(S.String, { exact: true }),
	profiles: S.optionalWith(
		S.Record({ key: S.String, value: S.Array(S.String) }),
		{ exact: true },
	),
	repository: S.optionalWith(S.String, { exact: true }),
});

export type DomainSchema = S.Schema.Type<typeof DomainSchemaSchema>;

/**
 * UnresolvedDomainSchema: Schema that may contain $ref entries to external files.
 * Used when loading schemas from files before resolving includes.
 */
export const UnresolvedDomainSchemaSchema = S.Struct({
	$schema: S.optionalWith(S.String, { exact: true }),
	author: S.optionalWith(S.String, { exact: true }),
	contexts: S.Record({ key: S.String, value: ContextEntrySchema }),
	description: S.optionalWith(S.String, { exact: true }),
	extensions: S.optionalWith(ExtensionsSchema, { exact: true }),
	license: S.optionalWith(S.String, { exact: true }),
	name: S.String,
	npmScope: S.optionalWith(S.String, { exact: true }),
	profiles: S.optionalWith(
		S.Record({ key: S.String, value: S.Array(S.String) }),
		{ exact: true },
	),
	repository: S.optionalWith(S.String, { exact: true }),
});

export type UnresolvedDomainSchema = S.Schema.Type<
	typeof UnresolvedDomainSchemaSchema
>;

// =============================================================================
// Parsing Functions
// =============================================================================

/**
 * Parse unknown data as DomainSchema (fully resolved, no $ref entries).
 * Throws ParseError on invalid input.
 */
export const parseSchema = S.decodeUnknownSync(DomainSchemaSchema);

/**
 * Parse unknown data as DomainSchema, returning Either.
 */
export const parseSchemaEither = S.decodeUnknownEither(DomainSchemaSchema);

/**
 * Parse unknown data as UnresolvedDomainSchema (may contain $ref entries).
 * Throws ParseError on invalid input.
 */
export const parseUnresolvedSchema = S.decodeUnknownSync(
	UnresolvedDomainSchemaSchema,
);

/**
 * Parse unknown data as UnresolvedDomainSchema, returning Either.
 */
export const parseUnresolvedSchemaEither = S.decodeUnknownEither(
	UnresolvedDomainSchemaSchema,
);

/**
 * Encode DomainSchema to plain object.
 */
export const encodeSchema = S.encodeSync(DomainSchemaSchema);

/**
 * Check if a context entry is a $ref to an external file.
 */
export const isContextRef = (entry: ContextEntry): entry is ContextIncludeDef =>
	"$ref" in entry;

/**
 * Validate that data conforms to DomainSchema (resolved).
 * Returns true/false without throwing.
 */
export const isValidSchema = (data: unknown): data is DomainSchema => {
	const result = S.decodeUnknownEither(DomainSchemaSchema)(data);
	return result._tag === "Right";
};

/**
 * Validate that data conforms to UnresolvedDomainSchema.
 * Returns true/false without throwing.
 */
export const isValidUnresolvedSchema = (
	data: unknown,
): data is UnresolvedDomainSchema => {
	const result = S.decodeUnknownEither(UnresolvedDomainSchemaSchema)(data);
	return result._tag === "Right";
};
