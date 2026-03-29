# Domain Model

## Ubiquitous Language

| Term                 | Definition                                                                                                      | Examples                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Domain Schema        | The root type describing an entire domain: entities, operations, invariants, vocabulary, contexts, and examples | "The TodoApp domain schema defines Todo entities and createTodo operations", "Parse the schema to validate its structure" |
| Entity               | A domain object with identity, attributes, and relationships. May be an aggregate root                          | "Todo is an entity with id, title, and done attributes", "User entity belongs to the Account aggregate"                   |
| Aggregate            | A cluster of entities with a root that ensures consistency. Child entities belong to the root's lifecycle       | "Order is an aggregate root containing OrderLine entities", "Deleting an Order cascades to its OrderLines"                |
| Operation            | A domain action with typed input, output, errors, and tags. Operations are the verbs of the domain              | "createTodo is an operation that takes a title and returns a Todo", "Operations tagged @cli appear in the CLI"            |
| Invariant            | A business rule that must always hold. Scoped to entity, aggregate, operation, or global                        | "Todo title must be non-empty", "Order total equals sum of line items"                                                    |
| Context              | A bounded context grouping related entities and operations. Maps to DDD's ubiquitous language boundary          | "The 'core' context contains Todo and createTodo", "Contexts define module boundaries"                                    |
| Vocabulary           | Domain-specific terms with definitions, aliases, and examples. The ubiquitous language glossary                 | "The vocabulary defines 'completed' as an alias for 'done'", "Vocabulary terms guide consistent naming"                   |
| Example              | A BDD scenario with Given/When/Then steps preserved from discovery for executable specifications                | "The 'create todo' example shows creating a todo with title 'Buy milk'", "Examples are refined into formal scenarios"     |
| Type Reference       | A reference to a type: primitive, entity, entityId, array, optional, or union                                   | "The output type is { kind: 'entity', name: 'Todo' }", "Array types wrap an element type"                                 |
| Constraint           | A validation rule on a type: nonEmpty, positive, range, pattern, or custom                                      | "Title has a nonEmpty constraint", "Age has a range constraint of 0-150"                                                  |
| Generator            | A function that transforms DomainSchema into GeneratedFile[]                                                    | "The types generator produces TypeScript interfaces", "Generators are pure functions"                                     |
| Generated File       | A file to write with filename and content                                                                       | "{ filename: 'types/entities.ts', content: '...' }", "Generators return arrays of generated files"                        |
| Generation Result    | The output of a generator containing an array of generated files                                                | "The result contains 3 files: ids.ts, entities.ts, schemas.ts", "Results are immutable"                                   |
| Operation Definition | Runtime operation with Effect Schema params/options and execute function                                        | "Operations use defineOperation() to create branded instances", "OperationDefinition<Deps, P, O, R>"                      |
| Tag                  | Metadata on operations/examples controlling which generators apply                                              | "@cli tags operations for CLI generation", "@core tags operations for direct library testing"                             |
| Binding              | Link from example step text to operation call with argument mapping                                             | "The 'I create a todo' step binds to createTodo with $title argument", "Bindings enable executable specifications"        |
| World                | Cucumber test context holding deps, entities, and last result/error                                             | "The CoreWorld class extends Cucumber's World", "World instances are reset between scenarios"                             |
| Scaffold             | Project template with interpolation for generating new packages                                                 | "init scaffolds a complete workspace", "add scaffolds libs or apps"                                        |
| Package Type         | Classification of generated package: lib, cli, or cluster                                                       | "Libs go in libs/, apps go in apps/", "CLI packages have bin entries"                                                     |
| Scope                | npm scope for packages in a monorepo                                                                            | "@todo for a todo app", "Scope prefixes all package names"                                                                |

## Entities

### DomainSchema

**Context**: Schema Definition

**Attributes**:

- `name`: string — unique identifier for this domain
- `contexts`: record of ContextDef — bounded contexts in this domain
- `entities`: record of EntityDef — domain objects with identity
- `operations`: record of OperationDef — domain actions
- `invariants`: array of InvariantDef — business rules
- `vocabulary`: record of TermDef — ubiquitous language glossary
- `examples`: array of ExampleDef — BDD scenarios from discovery

**Relationships**:

- has_many Context — schemas contain multiple bounded contexts
- has_many Entity — schemas define domain objects
- has_many Operation — schemas define domain actions
- has_many Invariant — schemas enforce business rules

### EntityDef

**Context**: Schema Definition

**Attributes**:

- `context`: string — which bounded context this entity belongs to
- `description`: string — human-readable explanation
- `attributes`: record of AttributeDef — properties with types and constraints
- `relationships`: array of RelationshipDef — connections to other entities
- `aggregate`: AggregateDef (optional) — aggregate membership and root status

**Relationships**:

- belongs_to Context — entities are scoped to contexts
- has_many Attribute — entities have typed properties
- has_many Relationship — entities connect to other entities
- may_be Aggregate Root — some entities control aggregate lifecycles

### OperationDef

**Context**: Schema Definition

**Attributes**:

- `context`: string — which bounded context this operation belongs to
- `description`: string — human-readable explanation
- `input`: record of ParamDef — typed parameters
- `output`: TypeRef — return type
- `errors`: array of ErrorDef — possible failure modes
- `tags`: array of string — metadata controlling generation (@cli, @core, @dsl)

**Relationships**:

- belongs_to Context — operations are scoped to contexts
- has_many Parameter — operations accept typed inputs
- has_one Output Type — operations return typed outputs
- has_many Error — operations may fail in known ways
- tagged_for Generator — tags control which generators include this operation

### TypeRef

**Context**: Type System

**Attributes**:

- `kind`: discriminator — primitive, entity, entityId, array, optional, or union
- (varies by kind): type-specific properties

**Variants**:

- PrimitiveTypeReference: `{ kind: 'primitive', name: 'string' | 'number' | 'boolean' | 'void' }`
- EntityTypeReference: `{ kind: 'entity', name: string }`
- EntityIdTypeReference: `{ kind: 'entityId', entity: string }`
- ArrayTypeReference: `{ kind: 'array', element: TypeRef }`
- OptionalTypeReference: `{ kind: 'optional', inner: TypeRef }`
- UnionTypeReference: `{ kind: 'union', values: string[] }`

**Relationships**:

- references Entity — entity and entityId types point to entities
- contains TypeRef — array and optional types wrap inner types

### ConstraintDef

**Context**: Validation

**Attributes**:

- `kind`: discriminator — nonEmpty, positive, range, pattern, or custom

**Variants**:

- NonEmptyConstraint: `{ kind: 'nonEmpty' }`
- PositiveConstraint: `{ kind: 'positive' }`
- RangeConstraint: `{ kind: 'range', min?: number, max?: number }`
- PatternConstraint: `{ kind: 'pattern', regex: string }`
- CustomConstraint: `{ kind: 'custom', name: string, description: string }`

**Relationships**:

- applies_to Attribute — constraints validate attribute values

### GeneratedFile

**Context**: Code Generation

**Attributes**:

- `filename`: string — path relative to output directory
- `content`: string — file contents to write

**Relationships**:

- part_of GenerationResult — files are grouped in results

### OperationDefinition

**Context**: Runtime Operations

**Attributes**:

- `name`: string — operation identifier
- `params`: Effect Schema — parameter validation schema
- `options`: Effect Schema — options validation schema
- `execute`: function — implementation receiving deps, params, options

**Relationships**:

- branded_by Symbol — OPERATION_BRAND ensures runtime type safety
- validated_by Schema — Effect Schema validates inputs

### ExampleDef

**Context**: Discovery Artifacts

**Attributes**:

- `name`: string — scenario title
- `narrative`: string — informal explanation
- `persona`: string — who is performing the action
- `tags`: array of string — generation targets
- `steps`: Given/When/Then structure with optional bindings

**Relationships**:

- involves Persona — examples show personas in action
- binds_to Operation — step bindings connect to operations
- tagged_for Generator — tags control step generation

## Bounded Contexts

### Schema Definition

Defines the formal schema language for describing domains.

**Package**: `@morphdsl/domain-schema`

**Entities**: DomainSchema, EntityDef, OperationDef, ContextDef, InvariantDef, TermDef, ExampleDef

**Key terms**: schema, entity, operation, invariant, context, vocabulary, example

### Type System

Provides type references and constraints for schema attributes.

**Package**: `@morphdsl/domain-schema`

**Entities**: TypeRef (and variants), ConstraintDef (and variants), ParamDef, AttributeDef

**Key terms**: type reference, primitive, constraint, parameter, attribute

### Runtime Operations

Defines the operation pattern for schema-first development.

**Package**: `@morphdsl/operation`

**Entities**: OperationDefinition

**Key terms**: operation definition, execute, params, options, branded

### Code Generation

Transforms schemas into generated files.

**Packages**: `@morphdsl/generator-types`, `@morphdsl/generator-core`, `@morphdsl/generator-steps`, `@morphdsl/runtime-cli`, `@morphdsl/scaffold`

**Entities**: GeneratedFile, GenerationResult

**Key terms**: generator, generated file, generation result

### Testing Infrastructure

Provides Cucumber step definitions and test contexts.

**Package**: `@morphdsl/generator-steps`

**Entities**: World, CoreWorld

**Key terms**: world, step definition, @core, @cli, @dsl

### Scaffolding

Creates new projects and packages from templates.

**Package**: `@morphdsl/scaffold`

**Entities**: (templates embedded as constants)

**Key terms**: scaffold, monorepo, package type, scope, template
