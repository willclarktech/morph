# Domain Schema Design

A formal schema format for the domain algebra, enabling structural derivation of libraries and apps.

## Context

This formalizes the **domain language itself** as an algebra with multiple interpreters (pure library, CLI, API, MCP).

**Category theory framing** (see [Algebraic Foundations](../concepts/algebraic-foundations.md)):

- **Theory T** = domain schema (sorts + operations + equations)
- **Free algebra** F_dsl = DSL (initial object, operations as data)
- **Concrete algebra** F_core = core library (one semantics)
- **Derived algebras** F_api, F_cli, F_mcp = apps (via natural transformation from F_core)

## Design Goals

1. **Extractable** from current prose artifacts (domain model, examples)
2. **Sufficient** to derive types, operations, CLI commands, API routes, MCP tools
3. **TypeScript-native** (not a separate file format)
4. **Preserves examples** for testing and documentation

---

## Schema Structure

```typescript
interface DomainSchema {
	readonly name: string;
	readonly extensions?: ExtensionsDef;
	readonly profiles?: Record<string, string[]>;
	readonly vocabulary: Record<string, TermDef>;
	readonly entities: Record<string, EntityDef>;
	readonly operations: Record<string, OperationDef>;
	readonly contexts: Record<string, ContextDef>;
	readonly invariants: readonly InvariantDef[];
	readonly examples: readonly ExampleDef[];
}
```

The `profiles` field maps profile names to arrays of tag strings. In the `.morph` DSL, profiles are defined in a `profiles {}` block and referenced with `#name` on operations (see [DSL Reference](../guides/dsl-reference.md#profiles)).

---

## Extensions (Infrastructure Configuration)

The `extensions` field declares which infrastructure extensions a project uses. See [Extensions](../concepts/extensions.md) for runtime config and available backends.

```typescript
interface ExtensionsDef {
	readonly storage?: {
		readonly backends: readonly string[];
		readonly default: string;
	};
	readonly auth?: {
		readonly providers: readonly string[];
		readonly default: string;
	};
	readonly eventStore?: {
		readonly backends: readonly string[];
		readonly default: string;
	};
	readonly i18n?: {
		readonly languages: readonly string[];
		readonly baseLanguage: string;
	};
}
```

**Example:**

```json
{
	"extensions": {
		"storage": {
			"backends": ["memory", "jsonfile", "sqlite", "redis"],
			"default": "memory"
		},
		"auth": {
			"providers": ["none", "inmemory", "test", "jwt"],
			"default": "jwt"
		}
	}
}
```

Extension source packages live in `extensions/` and are published as `@morphdsl/{name}-dsl` and `@morphdsl/{name}-impls`. Generated projects depend on these packages based on which extensions are declared in the schema.

---

## Vocabulary (Ubiquitous Language)

```typescript
interface TermDef {
	readonly definition: string;
	readonly examples: readonly string[];
	readonly aliases: readonly string[];
}
```

**Derived from:** Ubiquitous Language table in domain model

---

## Types

```typescript
type TypeRef =
	| {
			readonly kind: "primitive";
			readonly name: "boolean" | "date" | "datetime" | "float" | "integer" | "string" | "unknown" | "void";
	  }
	| { readonly kind: "entity"; readonly name: string }
	| { readonly kind: "entityId"; readonly entity: string }
	| { readonly kind: "array"; readonly element: TypeRef }
	| { readonly kind: "optional"; readonly inner: TypeRef }
	| { readonly kind: "union"; readonly values: readonly string[] }; // string literal union
```

**Design notes:**

- `entityId` is separate from `entity` - supports branded ID generation
- `union` for string literal unions (generates `"a" | "b" | "c"`, not TS enums)
- No `any` or `unknown` - must be explicit

---

## Entities & Aggregates

```typescript
interface EntityDef {
	readonly context: string;
	readonly description: string;
	readonly attributes: Record<string, AttributeDef>;
	readonly relationships: readonly RelationshipDef[];
	readonly aggregate?: AggregateDef;
}

interface AggregateDef {
	readonly root: boolean; // true = this is the aggregate root
	readonly parent?: string; // if not root, which entity is the root
	readonly cascadeDelete?: boolean; // delete children when root is deleted
}

interface AttributeDef {
	readonly type: TypeRef;
	readonly description: string;
	readonly constraints?: readonly ConstraintDef[];
}

type ConstraintDef =
	| { readonly kind: "nonEmpty" }
	| { readonly kind: "positive" }
	| { readonly kind: "range"; readonly min?: number; readonly max?: number }
	| { readonly kind: "pattern"; readonly regex: string }
	| {
			readonly kind: "custom";
			readonly name: string;
			readonly description: string;
	  };

interface RelationshipDef {
	readonly kind: "has_one" | "has_many" | "belongs_to" | "references";
	readonly target: string;
	readonly description: string;
	readonly inverse?: string;
}
```

**Derived from:** Entities section of domain model

---

## Operations

```typescript
interface OperationDef {
	readonly context: string;
	readonly description: string;
	readonly input: Record<string, ParamDef>;
	readonly output: TypeRef;
	readonly errors: readonly ErrorDef[];
	readonly tags: readonly string[]; // @core, @cli, @api, @mcp
}

interface ParamDef {
	readonly type: TypeRef;
	readonly description: string;
	readonly optional?: boolean;
	readonly default?: unknown;
}

interface ErrorDef {
	readonly name: string;
	readonly description: string;
	readonly when: string; // condition that causes this error
}
```

**Derived from:** Examples (Given/When/Then steps imply operations)

---

## Contexts (Bounded Contexts)

```typescript
interface ContextDef {
	readonly description: string;
	readonly entities: readonly string[];
	readonly operations: readonly string[];
	readonly dependencies: readonly string[];
}
```

**Derived from:** Bounded Contexts section of domain model

---

## Invariants (Domain Rules)

```typescript
interface InvariantDef {
	readonly name: string;
	readonly description: string;
	readonly scope: InvariantScope;
	readonly condition: ConditionExpr;
	readonly violation: string;
}

type InvariantScope =
	| { readonly kind: "entity"; readonly entity: string }
	| { readonly kind: "aggregate"; readonly root: string }
	| {
			readonly kind: "operation";
			readonly operation: string;
			readonly when: "pre" | "post";
	  }
	| { readonly kind: "context" } // authorization rules referencing execution context
	| { readonly kind: "global" };

type ConditionExpr =
	| {
			readonly kind: "equals";
			readonly left: ValueExpr;
			readonly right: ValueExpr;
	  }
	| {
			readonly kind: "notEquals";
			readonly left: ValueExpr;
			readonly right: ValueExpr;
	  }
	| {
			readonly kind: "implies";
			readonly if: ConditionExpr;
			readonly then: ConditionExpr;
	  }
	| { readonly kind: "and"; readonly conditions: readonly ConditionExpr[] }
	| { readonly kind: "or"; readonly conditions: readonly ConditionExpr[] }
	| { readonly kind: "not"; readonly condition: ConditionExpr }
	| {
			readonly kind: "forAll";
			readonly collection: ValueExpr;
			readonly variable: string;
			readonly condition: ConditionExpr;
	  }
	| {
			readonly kind: "exists";
			readonly collection: ValueExpr;
			readonly variable: string;
			readonly condition: ConditionExpr;
	  }
	| { readonly kind: "isAuthenticated" }; // context.currentUser !== undefined

type ValueExpr =
	| { readonly kind: "field"; readonly path: string }
	| { readonly kind: "literal"; readonly value: unknown }
	| { readonly kind: "variable"; readonly name: string }
	| { readonly kind: "count"; readonly collection: ValueExpr };
```

**Derived from:** "Then" steps in examples, explicit business rules

**What invariants enable:**

- Generate validation guards in operations
- Generate precondition checks at API/CLI boundaries
- Derive error types from violations
- Generate property-based tests

---

## Examples (Preserved from Discovery)

```typescript
interface ExampleDef {
	readonly name: string;
	readonly persona: string;
	readonly narrative: string;
	readonly steps: {
		readonly given: readonly StepDef[];
		readonly when: readonly StepDef[];
		readonly then: readonly StepDef[];
	};
	readonly tags: readonly string[];
}

interface StepDef {
	readonly text: string;
	readonly binding?: StepBinding;
}

type StepBinding =
	| {
			readonly kind: "operation";
			readonly name: string;
			readonly args: Record<string, unknown>;
	  }
	| {
			readonly kind: "assertion";
			readonly entity: string;
			readonly condition: string;
	  }
	| { readonly kind: "state"; readonly description: string };
```

**Preserved from:** Examples artifact from discovery phase

---

## Derivation Examples

### Types (from entities)

```typescript
// Input: entities.TodoItem
// Output:
type TodoItemId = string & { readonly __brand: "TodoItemId" };

interface TodoItem {
	readonly id: TodoItemId;
	readonly title: string;
	readonly completed: boolean;
	readonly priority: "low" | "medium" | "high";
}
```

### Operation Signatures (from operations)

```typescript
// Input: operations.createItem
// Output:
const createItem: (
	listId: TodoListId,
	title: string,
	priority?: "low" | "medium" | "high",
) => Effect<TodoItem, ListNotFound | EmptyTitle>;
```

### CLI Command (from operations)

```typescript
// Input: operations.createItem
// Output:
command("create-item")
	.requiredOption("--list-id <id>", "The list to add to")
	.requiredOption("--title <title>", "The item's title")
	.option("--priority <priority>", "Initial priority", "medium")
	.action(async (opts) => {
		const result = await createItem(opts.listId, opts.title, opts.priority);
		// output formatting derived from output type
	});
```

### API Route (from operations)

```typescript
// Input: operations.createItem
// Output:
router.post("/lists/:listId/items", async (req) => {
	const listId = parseEntityId("TodoList", req.params.listId);
	const { title, priority } = validateBody(req, {
		title: z.string().min(1),
		priority: z.enum(["low", "medium", "high"]).optional(),
	});
	return operations.createItem(listId, title, priority);
});
```

### MCP Tool (from operations)

```typescript
// Input: operations.createItem
// Output:
{
  name: "create_item",
  description: "Add a new item to a list",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "The list to add to" },
      title: { type: "string", description: "The item's title" },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Initial priority",
      },
    },
    required: ["listId", "title"],
  },
}
```

---

## Pure Types (Transformation Domains)

For domains that don't need entities (code generators, compilers, data transformations), use pure types:

```typescript
interface TypeDef =
  | ProductTypeDef   // record/struct
  | SumTypeDef       // discriminated union
  | AliasTypeDef;    // type alias

interface ProductTypeDef {
  readonly kind: "product";
  readonly description: string;
  readonly fields: Record<string, FieldDef>;
}

interface SumTypeDef {
  readonly kind: "sum";
  readonly description: string;
  readonly discriminator: string;  // tag field name
  readonly variants: Record<string, VariantDef>;
}

interface AliasTypeDef {
  readonly kind: "alias";
  readonly description: string;
  readonly type: TypeRef;
}

interface FieldDef {
  readonly description: string;
  readonly type: TypeRef;
}

interface VariantDef {
  readonly description: string;
  readonly fields?: Record<string, FieldDef>;
}
```

**TypeRef extension:**

```typescript
type TypeRef =
  | ... // existing variants
  | { readonly kind: "type"; readonly name: string; readonly context?: string };
```

**Use cases:**

- Code generators (morph itself)
- Data transformers
- Compilers and parsers
- Pure computation libraries

---

## Functions (Pure Transformations)

Functions are pure operations without side effects:

```typescript
interface FunctionDef {
	readonly description: string;
	readonly input: Record<string, ParamDef>;
	readonly output: TypeRef;
	readonly errors: readonly ErrorDef[];
	readonly tags: readonly string[]; // @cli, @api, @mcp
	// NO emits - pure functions don't produce events
	// NO uses - no aggregate dependencies
}
```

**Difference from Commands/Queries:**

- No event emission (pure, no side effects)
- No aggregate access (stateless)
- No pre/post conditions (types are the contract)

**Example:**

```json
{
	"functions": {
		"generateTypes": {
			"description": "Generate TypeScript types from domain schema",
			"input": {
				"schema": { "type": { "kind": "type", "name": "DomainSchema" } }
			},
			"output": {
				"kind": "array",
				"element": { "kind": "type", "name": "GeneratedFile" }
			},
			"errors": [],
			"tags": ["@cli"]
		}
	}
}
```

---

## CRUD vs Transformation Domains

| Aspect        | CRUD Domain                       | Transformation Domain      |
| ------------- | --------------------------------- | -------------------------- |
| Core concept  | Entities with lifecycle           | Pure types                 |
| Operations    | Commands (emit events) + Queries  | Functions (pure)           |
| State         | Persistent (repositories)         | Stateless                  |
| Examples      | Todo apps, CRM                    | Code generators, compilers |
| Schema fields | `entities`, `commands`, `queries` | `types`, `functions`       |

**Hybrid schemas** can use both: entities for persisted state, types for intermediate data.

---

## Future Extensions

- ~~**Events**~~ - Done: Operations declare domain events they emit via `emits` array
- ~~**CQRS**~~ - Done: Explicit `commands` and `queries` sections
- ~~**Pure Types**~~ - Done: `types` and `functions` for transformation domains
- ~~**Authorization**~~ - Done: Context-scoped invariants with role-based conditions
- ~~**Generics**~~ - Done: `TypeParameterDef` with constraints/defaults, DSL `<T>` syntax
- **Streaming** - `Stream<T>` for async iteration
- **Function types** - Higher-order functions in TypeRef
- **Computed properties** - Entities could have derived attributes
