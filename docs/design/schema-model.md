# Schema Model Design

## Current State

DomainSchema is **entity-centric**, designed for CRUD applications:

- **Entities** with identity and lifecycle
- **Aggregate roots** defining consistency boundaries
- **Relationships** (has_many, belongs_to)
- **Operations** that mutate entity state
- **Invariants** constraining entity state

This model works well for entity-heavy domains (e.g. workflow orchestration with 24+ entities and state transitions).

## The CRUD Pattern

Most applications follow CRUD patterns:

```
Entity → Repository → Operations (Create, Read, Update, Delete)
```

Generators produce:

- Branded ID types for entities
- Entity interfaces with attributes
- Repository interfaces for persistence
- Operation stubs with dependency injection

### Example: Todo Application

```typescript
// Schema
entities: {
  Todo: {
    attributes: { title, completed },
    aggregate: { root: true }
  }
}
operations: {
  createTodo: { input: { title }, output: Todo }
}

// Generated
type TodoId = string & { __brand: 'TodoId' }
interface Todo { id: TodoId; title: string; completed: boolean }
interface TodoRepository { save(todo: Todo): Promise<void> }
interface Deps { todoRepository: TodoRepository }
const createTodo = defineOperation(...) // uses deps.todoRepository
```

## Entity vs Value Object

Not everything needs identity. The schema should distinguish:

| Concept      | Has Identity | Has Lifecycle | Needs Repository        |
| ------------ | ------------ | ------------- | ----------------------- |
| Entity       | Yes          | Yes           | Yes (if aggregate root) |
| Value Object | No           | No            | No                      |

**Entities**: User, Order, Todo - things you find by ID, that change over time.

**Value Objects**: Address, Money, DateRange - defined by attributes, immutable, interchangeable.

### Current Gap

The schema treats everything as an entity. Value objects get unnecessary IDs:

```typescript
// Current: GeneratedFile gets an ID (wrong)
entities: {
	GeneratedFile: {
		attributes: {
			(filename, content);
		}
	}
}

// Better: Explicit value object
valueObjects: {
	GeneratedFile: {
		attributes: {
			(filename, content);
		}
	}
}
```

## Aggregate Roots and Repositories

Only aggregate roots need repositories. Child entities are accessed through their parent:

```typescript
// Order is aggregate root, OrderItem is child
entities: {
  Order: { aggregate: { root: true } },        // → OrderRepository
  OrderItem: { aggregate: { parent: "Order" } } // → no repository
}
```

Generator should:

1. Generate repository interface only for aggregate roots
2. Child entities accessed via parent's repository
3. Value objects have no persistence concern

## Recommended Schema Structure

```typescript
interface DomainSchema {
	name: string;
	contexts: Record<string, BoundedContext>;

	// Entities with identity and lifecycle
	entities: Record<string, EntityDef>;

	// Value objects (immutable, no identity)
	valueObjects?: Record<string, ValueObjectDef>;

	// Operations (CRUD or queries)
	operations: Record<string, OperationDef>;

	// Business rules
	invariants?: Invariant[];

	// Domain language
	vocabulary?: Record<string, Term>;
	examples?: Example[];
}
```

## Generator Improvements

1. **Skip IDs for value objects** - Only entities get branded IDs
2. **Skip repositories for non-roots** - Only aggregate roots get repositories
3. **Deps contains repositories** - One per aggregate root
4. **Operations use deps** - CRUD operations delegate to repositories

---

## Future: Non-CRUD Domains

Some domains are **transformation-centric** rather than entity-centric:

| CRUD Domains            | Transformation Domains |
| ----------------------- | ---------------------- |
| Entities with lifecycle | Pure functions         |
| State mutations         | Stateless transforms   |
| Repositories            | No persistence         |
| todo apps, e-commerce   | morph, compilers       |

### The Challenge

Morph is a code generator. Its operations are pure transformations:

```
generateTypes :: DomainSchema → GeneratedFile[]
```

No entities with lifecycle. No repositories. No state mutation.

The current schema forces morph to use entity patterns where they don't fit.

### Options Considered

1. **Keep CRUD-focused** - Morph is edge case, accept imperfect fit
2. **Add annotations** - `pure: true`, `readonly: true` on operations
3. **Entity-optional schemas** - Support `types` alongside `entities`

### Recommendation

For MVP: Focus on CRUD. Most target applications are CRUD.

Post-MVP: Extend schema with `types` for transformation domains:

```typescript
// CRUD schema
{ entities: { Todo }, operations: { createTodo } }

// Transformation schema
{ types: { Schema, File }, operations: { generateTypes } }

// Hybrid
{ entities: { Report }, types: { ReportOutput }, operations: { ... } }
```

This allows morph to describe itself accurately while keeping the common case simple.

See backlog item: "Extend schema for non-CRUD domains"

---

## Dogfooding Results

Tested generators with two schemas:

1. **todoSchema** - CRUD application (User, Todo entities)
2. **morphSchema** - Transformation domain (code generation)

### Track 1: Todo App (CRUD)

**Types (✓ compiles):**

```
types/ids.ts       - UserId, TodoId branded types
types/entities.ts  - User, Todo interfaces with IDs
types/schemas.ts   - Effect Schema validators
```

**Operations (✗ broken):**

- References undefined `UserSchema`, `TodoSchema` in params
- Generator doesn't import schema types from types/
- Empty Deps interface (no repositories generated)

**Steps (✗ broken):**

- References undefined variables (`userId`, `todoId`)
- World property access issues (Cucumber typing)
- References non-existent `@todo/core` module

### Track 2: Morph (Transformation)

**Generated vs Hand-written:**

```typescript
// Hand-written (morph/modules/domain-schema/src/result.ts)
export interface GeneratedFile {
	readonly content: string;
	readonly filename: string;
}

// Generated (.tmp/morph-generated/types/entities.ts)
export interface GeneratedFile {
	readonly id: GeneratedFileId; // UNWANTED
	readonly filename: string;
	readonly content: string;
}
```

**Findings:**

1. **IDs on value objects** - GeneratedFile, GenerationResult get unwanted IDs
2. **Empty Deps** - No dependencies generated (correct for transforms, but should have repositories for CRUD)
3. **Steps skipped** - Not applicable for pure transformations

### Generator Bugs Found

| Generator            | Bug                    | Fix Needed                                         |
| -------------------- | ---------------------- | -------------------------------------------------- |
| generator-operations | Missing schema imports | Import from types/                                 |
| generator-operations | Empty Deps             | Generate repository interfaces for aggregate roots |
| generator-steps      | Undefined variables    | Properly scope entity IDs                          |
| generator-steps      | World typing           | Use bracket notation or fix types                  |
| generator-types      | IDs for all entities   | Need valueObjects distinction                      |

### What Works

- Type generation (ids, entities, schemas) compiles
- Operation structure is correct (defineOperation pattern)
- CLI generation works (morph-cli exists)
- Scaffold generation works (used for morph packages)

### What Needs Work

1. **generator-operations**: Import schemas, generate repository deps
2. **generator-steps**: Fix variable scoping, typing issues
3. **generator-types**: Support valueObjects without IDs
4. **DomainSchema**: Add valueObjects field

### Conclusion

Generators produce correct structure but have gaps:

- Types work for basic CRUD
- Operations need repository/deps generation
- Steps need significant fixes
- Value objects need explicit schema support
