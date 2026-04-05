# Schema Model

The domain schema is the internal representation of a parsed `.morph` file. It captures entities, value objects, operations, invariants, and extensions — everything generators need to produce code.

## Schema Structure

A compiled schema is organized by bounded contexts:

```typescript
interface DomainSchema {
  name: string;
  extensions: ExtensionsConfig;
  contexts: Record<string, ContextDef>;
}
```

Each context contains:

```typescript
interface ContextDef {
  entities: Record<string, EntityDef>;
  valueObjects?: Record<string, ValueObjectDef>;
  commands?: Record<string, CommandDef>;
  queries?: Record<string, QueryDef>;
  functions?: Record<string, FunctionDef>;
  invariants?: InvariantDef[];
  subscribers?: Record<string, SubscriberDef>;
  ports?: Record<string, PortDef>;
  contracts?: ContractDef[];
}
```

Schema definitions live in `contexts/generation/domain-schema/src/schemas/`.

## Entities

Entities have identity, lifecycle, and aggregate boundaries:

```typescript
interface EntityDef {
  attributes: Record<string, AttributeDef>;
  aggregate: AggregateDef;        // { root: boolean, parent?, cascadeDelete? }
  description: string;
  relationships?: RelationshipDef[];
}
```

Every entity gets an implicit `id` field. Only aggregate roots (`root: true`) get repositories. Child entities (`parent: "Order"`) are accessed through their parent's repository.

## Value Objects

Value objects are immutable composites with no identity:

```typescript
interface ValueObjectDef {
  attributes: Record<string, AttributeDef>;
  description: string;
}
```

Unlike entities, value objects have no `aggregate` field and no `relationships`. They are embedded within entities as composite attribute types.

## Operations

Three operation kinds with distinct capabilities:

| | Command | Query | Function |
|---|---|---|---|
| State change | Yes (writes) | No (reads) | No access |
| Events | Required (emits) | None | None |
| Pre-conditions | Yes | Yes | No |
| Post-conditions | Yes | No | No |
| Type parameters | No | No | Yes |

## Type System

Attribute and parameter types use a discriminated union:

| Kind | Example | Schema |
|------|---------|--------|
| `primitive` | `string`, `boolean`, `integer`, `float`, `date` | `{ kind: "primitive", name: "string" }` |
| `array` | `string[]` | `{ kind: "array", element: ... }` |
| `optional` | `string?` | `{ kind: "optional", inner: ... }` |
| `union` | `"a" \| "b"` | `{ kind: "union", variants: [...] }` |
| `entityId` | `User.id` | `{ kind: "entityId", entity: "User" }` |
| `entity` | `User` | `{ kind: "entity", entity: "User" }` |
| `valueObject` | `Address` | `{ kind: "valueObject", valueObject: "Address" }` |
| `generic` | `Result<T, E>` | `{ kind: "generic", name: "Result", args: [...] }` |

## Invariant Conditions

Invariants use a condition expression AST supporting boolean algebra, comparisons, quantifiers, and field access:

```typescript
type ConditionExpr =
  | { kind: "equals" | "notEquals" | "greaterThan" | ... }
  | { kind: "and" | "or"; conditions: ConditionExpr[] }
  | { kind: "not"; condition: ConditionExpr }
  | { kind: "forAll" | "exists"; variable: string; collection: string; condition: ConditionExpr }
  | { kind: "contains"; collection: ValueExpr; element: ValueExpr }
  | { kind: "implies"; premise: ConditionExpr; conclusion: ConditionExpr }
```

Value expressions reference fields, literals, variables, counts, and function calls.

## Extensions

Infrastructure configuration declared alongside the domain:

```typescript
interface ExtensionsConfig {
  storage?: StorageConfig;     // backends: StorageBackend[], default
  auth?: AuthConfig;           // providers: AuthProvider[], default
  eventStore?: EventStoreConfig;
  encoding?: EncodingConfig;   // formats: EncodingFormat[], default
  i18n?: I18nConfig;           // languages, baseLanguage
  sse?: SseConfig;             // enabled flag
}
```

See [Extensions](../architecture/extensions.md) for runtime configuration details.
