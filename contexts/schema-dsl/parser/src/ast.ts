// =============================================================================
// Source Location
// =============================================================================

export interface SourcePosition {
	readonly line: number;
	readonly column: number;
	readonly offset: number;
}

export interface SourceRange {
	readonly start: SourcePosition;
	readonly end: SourcePosition;
}

// =============================================================================
// Tags
// =============================================================================

export interface TagAst {
	readonly name: string;
	readonly args?: readonly string[];
	readonly range: SourceRange;
}

// =============================================================================
// Type Expressions
// =============================================================================

export type TypeExprAst =
	| PrimitiveTypeAst
	| NamedTypeAst
	| EntityIdTypeAst
	| ArrayTypeAst
	| OptionalTypeAst
	| UnionTypeAst
	| GenericTypeAst
	| FunctionTypeAst
	| TypeParamAst;

export interface PrimitiveTypeAst {
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
	readonly range: SourceRange;
}

export interface NamedTypeAst {
	readonly kind: "named";
	readonly name: string;
	readonly range: SourceRange;
}

export interface EntityIdTypeAst {
	readonly kind: "entityId";
	readonly entity: string;
	readonly range: SourceRange;
}

export interface ArrayTypeAst {
	readonly kind: "array";
	readonly element: TypeExprAst;
	readonly range: SourceRange;
}

export interface OptionalTypeAst {
	readonly kind: "optional";
	readonly inner: TypeExprAst;
	readonly range: SourceRange;
}

export interface UnionTypeAst {
	readonly kind: "union";
	readonly values: readonly string[];
	readonly range: SourceRange;
}

export interface GenericTypeAst {
	readonly kind: "generic";
	readonly name: string;
	readonly args: readonly TypeExprAst[];
	readonly range: SourceRange;
}

export interface FunctionTypeAst {
	readonly kind: "function";
	readonly params: readonly FunctionParamAst[];
	readonly returns: TypeExprAst;
	readonly range: SourceRange;
}

export interface FunctionParamAst {
	readonly name: string;
	readonly type: TypeExprAst;
}

export interface TypeParamAst {
	readonly kind: "typeParam";
	readonly name: string;
	readonly range: SourceRange;
}

// =============================================================================
// Type Parameter Definitions
// =============================================================================

export interface TypeParameterAst {
	readonly name: string;
	readonly constraint?: TypeExprAst;
	readonly default?: TypeExprAst;
	readonly range: SourceRange;
}

// =============================================================================
// Condition Expressions (for invariants)
// =============================================================================

export type ConditionExprAst =
	| ComparisonAst
	| AndAst
	| OrAst
	| NotAst
	| ImpliesAst
	| ExistsAst
	| ForAllAst
	| ContainsAst;

export interface ComparisonAst {
	readonly kind:
		| "equals"
		| "notEquals"
		| "greaterThan"
		| "greaterThanOrEqual"
		| "lessThan"
		| "lessThanOrEqual";
	readonly left: ValueExprAst;
	readonly right: ValueExprAst;
	readonly range: SourceRange;
}

export interface AndAst {
	readonly kind: "and";
	readonly conditions: readonly ConditionExprAst[];
	readonly range: SourceRange;
}

export interface OrAst {
	readonly kind: "or";
	readonly conditions: readonly ConditionExprAst[];
	readonly range: SourceRange;
}

export interface NotAst {
	readonly kind: "not";
	readonly condition: ConditionExprAst;
	readonly range: SourceRange;
}

export interface ImpliesAst {
	readonly kind: "implies";
	readonly if: ConditionExprAst;
	readonly then: ConditionExprAst;
	readonly range: SourceRange;
}

export interface ExistsAst {
	readonly kind: "exists";
	readonly variable: string;
	readonly collection: ValueExprAst;
	readonly condition: ConditionExprAst;
	readonly range: SourceRange;
}

export interface ForAllAst {
	readonly kind: "forAll";
	readonly variable: string;
	readonly collection: ValueExprAst;
	readonly condition: ConditionExprAst;
	readonly range: SourceRange;
}

export interface ContainsAst {
	readonly kind: "contains";
	readonly collection: ValueExprAst;
	readonly value: ValueExprAst;
	readonly range: SourceRange;
}

// =============================================================================
// Value Expressions
// =============================================================================

export type ValueExprAst =
	| CallExprAst
	| CountAst
	| FieldAst
	| LiteralAst
	| VariableAst;

export interface CallExprAst {
	readonly kind: "call";
	readonly name: string;
	readonly args: readonly ValueExprAst[];
	readonly field?: string | undefined;
	readonly range: SourceRange;
}

export interface FieldAst {
	readonly kind: "field";
	readonly path: string;
	readonly range: SourceRange;
}

export interface LiteralAst {
	readonly kind: "literal";
	readonly value: string | number | boolean | undefined;
	readonly range: SourceRange;
}

export interface VariableAst {
	readonly kind: "variable";
	readonly name: string;
	readonly range: SourceRange;
}

export interface CountAst {
	readonly kind: "count";
	readonly collection: ValueExprAst;
	readonly range: SourceRange;
}

// =============================================================================
// Constraint AST
// =============================================================================

export type ConstraintAst =
	| { readonly kind: "unique" }
	| { readonly kind: "nonEmpty" }
	| { readonly kind: "positive" }
	| { readonly kind: "pattern"; readonly regex: string }
	| { readonly kind: "range"; readonly max?: number; readonly min?: number }
	| {
			readonly description: string;
			readonly kind: "custom";
			readonly name: string;
	  };

// =============================================================================
// Domain Declarations
// =============================================================================

export interface AttributeAst {
	readonly name: string;
	readonly type: TypeExprAst;
	readonly description?: string;
	readonly optional?: boolean;
	readonly constraints?: readonly ConstraintAst[];
	readonly sensitive?: boolean;
	readonly range: SourceRange;
}

export interface RelationshipAst {
	readonly kind: "belongs_to" | "has_many" | "has_one" | "references";
	readonly target: string;
	readonly description?: string;
	readonly inverse?: string;
	readonly range: SourceRange;
}

export interface EntityAst {
	readonly name: string;
	readonly description?: string;
	readonly tags: readonly TagAst[];
	readonly attributes: readonly AttributeAst[];
	readonly relationships: readonly RelationshipAst[];
	readonly range: SourceRange;
}

export interface ValueObjectAst {
	readonly name: string;
	readonly description?: string;
	readonly attributes: readonly AttributeAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Operations
// =============================================================================

export interface ParamAst {
	readonly name: string;
	readonly type: TypeExprAst;
	readonly description?: string;
	readonly optional?: boolean;
	readonly sensitive?: boolean;
	readonly default?: string | number | boolean;
	readonly range: SourceRange;
}

export interface EmittedEventAst {
	readonly name: string;
	readonly description?: string;
	readonly range: SourceRange;
}

export interface ErrorRefAst {
	readonly name: string;
	readonly description?: string;
	readonly when?: string;
	readonly range: SourceRange;
}

export interface AggregateRefAst {
	readonly access: "read" | "write";
	readonly aggregate: string;
	readonly range: SourceRange;
}

export interface CommandAst {
	readonly name: string;
	readonly description?: string;
	readonly tags: readonly TagAst[];
	readonly uses: readonly AggregateRefAst[];
	readonly pre?: readonly string[];
	readonly post?: readonly string[];
	readonly input: readonly ParamAst[];
	readonly output: TypeExprAst;
	readonly emits: readonly EmittedEventAst[];
	readonly errors: readonly ErrorRefAst[];
	readonly range: SourceRange;
}

export interface QueryAst {
	readonly name: string;
	readonly description?: string;
	readonly tags: readonly TagAst[];
	readonly uses: readonly AggregateRefAst[];
	readonly pre?: readonly string[];
	readonly input: readonly ParamAst[];
	readonly output: TypeExprAst;
	readonly errors: readonly ErrorRefAst[];
	readonly range: SourceRange;
}

export interface FunctionDeclAst {
	readonly name: string;
	readonly description?: string;
	readonly tags: readonly TagAst[];
	readonly typeParameters?: readonly TypeParameterAst[];
	readonly input: readonly ParamAst[];
	readonly output: TypeExprAst;
	readonly errors: readonly ErrorRefAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Invariants
// =============================================================================

export type InvariantScopeAst =
	| { readonly kind: "global" }
	| { readonly entity: string; readonly kind: "entity" }
	| { readonly kind: "aggregate"; readonly root: string }
	| {
			readonly kind: "operation";
			readonly operation: string;
			readonly when: "pre" | "post";
	  }
	| { readonly kind: "context" };

export interface InvariantAst {
	readonly name: string;
	readonly description?: string;
	readonly tags: readonly TagAst[];
	readonly scope: InvariantScopeAst;
	readonly violation?: string;
	readonly condition: ConditionExprAst;
	readonly range: SourceRange;
}

// =============================================================================
// Contracts
// =============================================================================

export interface ContractBindingAst {
	readonly name: string;
	readonly type: string;
}

export interface ContractAst {
	readonly name: string;
	readonly port: string;
	readonly description?: string;
	readonly bindings: readonly ContractBindingAst[];
	readonly afterSteps: readonly CallExprAst[];
	readonly assertion: ConditionExprAst;
	readonly range: SourceRange;
}

// =============================================================================
// Subscribers
// =============================================================================

export interface SubscriberAst {
	readonly name: string;
	readonly description?: string;
	readonly events: readonly string[];
	readonly range: SourceRange;
}

// =============================================================================
// Ports
// =============================================================================

export interface PortMethodAst {
	readonly name: string;
	readonly params: readonly ParamAst[];
	readonly returns: TypeExprAst;
	readonly description?: string;
	readonly throws?: readonly string[];
	readonly range: SourceRange;
}

export interface PortAst {
	readonly name: string;
	readonly description?: string;
	readonly typeParameters?: readonly TypeParameterAst[];
	readonly methods: readonly PortMethodAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Context Errors
// =============================================================================

export interface ContextErrorAst {
	readonly name: string;
	readonly description?: string;
	readonly fields: readonly AttributeAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Types (product, sum, alias)
// =============================================================================

export interface FieldAstDef {
	readonly name: string;
	readonly type: TypeExprAst;
	readonly description?: string;
	readonly optional?: boolean;
	readonly range: SourceRange;
}

export interface ProductTypeAst {
	readonly kind: "product";
	readonly name: string;
	readonly description?: string;
	readonly typeParameters?: readonly TypeParameterAst[];
	readonly fields: readonly FieldAstDef[];
	readonly range: SourceRange;
}

export interface VariantAst {
	readonly name: string;
	readonly description?: string;
	readonly fields?: readonly FieldAstDef[];
	readonly range: SourceRange;
}

export interface SumTypeAst {
	readonly kind: "sum";
	readonly name: string;
	readonly description?: string;
	readonly discriminator: string;
	readonly typeParameters?: readonly TypeParameterAst[];
	readonly variants: readonly VariantAst[];
	readonly range: SourceRange;
}

export interface AliasTypeAst {
	readonly kind: "alias";
	readonly name: string;
	readonly description?: string;
	readonly typeParameters?: readonly TypeParameterAst[];
	readonly type: TypeExprAst;
	readonly range: SourceRange;
}

export type TypeDeclAst = ProductTypeAst | SumTypeAst | AliasTypeAst;

// =============================================================================
// Profiles
// =============================================================================

export interface ProfileEntryAst {
	readonly name: string;
	readonly tags: readonly TagAst[];
	readonly range: SourceRange;
}

export interface ProfilesAst {
	readonly entries: readonly ProfileEntryAst[];
	readonly range: SourceRange;
}

export interface ProfileRefAst {
	readonly name: string;
	readonly range: SourceRange;
}

// =============================================================================
// Extensions
// =============================================================================

export interface ExtensionEntryAst {
	readonly name: string;
	readonly options: readonly string[];
	readonly default?: string;
	readonly base?: string;
	readonly range: SourceRange;
}

export interface ExtensionsAst {
	readonly entries: readonly ExtensionEntryAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Context
// =============================================================================

export interface ContextAst {
	readonly name: string;
	readonly description?: string;
	readonly entities: readonly EntityAst[];
	readonly valueObjects: readonly ValueObjectAst[];
	readonly commands: readonly CommandAst[];
	readonly queries: readonly QueryAst[];
	readonly functions: readonly FunctionDeclAst[];
	readonly invariants: readonly InvariantAst[];
	readonly contracts: readonly ContractAst[];
	readonly subscribers: readonly SubscriberAst[];
	readonly ports: readonly PortAst[];
	readonly errors: readonly ContextErrorAst[];
	readonly types: readonly TypeDeclAst[];
	readonly dependencies: readonly string[];
	readonly range: SourceRange;
}

// =============================================================================
// Domain (root)
// =============================================================================

export interface DomainAst {
	readonly name: string;
	readonly extensions?: ExtensionsAst;
	readonly profiles?: ProfilesAst;
	readonly contexts: readonly ContextAst[];
	readonly range: SourceRange;
}

// =============================================================================
// Parse Errors
// =============================================================================

export type Severity = "error" | "warning";

export interface ParseError {
	readonly message: string;
	readonly range: SourceRange;
	readonly severity: Severity;
}
