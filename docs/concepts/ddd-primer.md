# DDD Primer

Morph's schema language is built on domain-driven design concepts. This page covers the ones you need to know, with morph-specific examples.

## Entities

An **entity** is an object with a persistent identity. Two entities with the same attributes are still different objects if they have different IDs. In morph, entities declare their attributes, relationships, and aggregate role:

```morph
@root
entity Todo "A task to be completed." {
    completed: boolean "Whether the task is finished"
    title: string "What needs to be done"
    userId: User.id "The user who owns this todo"
    belongs_to User "Created by user"
}
```

Every entity gets an implicit `id` field. Attribute types can be primitives (`string`, `boolean`, `integer`, `float`, `date`), arrays (`string[]`), optionals (`string?`), unions (`"low" | "medium" | "high"`), or references to other entities (`User.id`).

## Value Objects

A **value object** has no identity — it's defined entirely by its attributes. Two addresses with the same street, city, and zip are the same address. Value objects are immutable and are embedded within entities, not stored independently:

```morph
value Address "A structured mailing address." {
    city: string
    country: string
    street: string
    zip: string
}

entity Contact {
    name: string
    address: Address "Mailing address"
}
```

Unlike entities, value objects have no relationships and no aggregate role.

## Aggregates

An **aggregate** is a cluster of entities treated as a unit for consistency. One entity is the **aggregate root** — the entry point for all access. In morph, mark roots with `@root`:

```morph
@root
entity User { ... }

@root
entity Todo {
    userId: User.id
    belongs_to User
}
```

Operations declare which aggregates they touch via `reads` and `writes` clauses. Cross-aggregate operations (touching multiple roots) are domain services:

```morph
command transferTodos "Transfer todos between users."
    reads User, writes Todo
    input {
        fromUserId: User.id
        toUserId: User.id
    }
```

## Commands and Queries

**Commands** change state and must emit at least one domain event:

```morph
command completeTodo "Mark a todo as completed."
    writes Todo
    pre UserOwnsTodo
    input { todoId: Todo.id }
    output Todo
    emits TodoCompleted "Emitted when a todo is marked as complete"
```

**Queries** are read-only — no state changes, no events:

```morph
query getTodo "Get a single todo by ID."
    reads Todo
    pre UserOwnsTodo
    input { todoId: Todo.id }
    output Todo
```

This is CQRS (command-query responsibility segregation). See [CQRS](cqrs.md) for the full picture.

## Functions

**Functions** are pure transformations with no aggregate access and no side effects. They're used in transformation-centric domains (code generators, compilers, parsers):

```morph
function generate "Generate code from a schema."
    input { schema: string }
    output GenerationResult
```

Functions can have type parameters, unlike commands and queries. See [Transformation Domains](transformation-domains.md).

## Domain Events

A **domain event** records that something happened. Events are facts — immutable records of state changes. In morph, commands declare the events they emit:

```morph
command createTodo "Create a new todo."
    writes Todo
    input { title: string, userId: User.id }
    output Todo
    emits TodoCreated "Emitted when a new todo is created"
```

Events can be consumed by subscribers for side effects like auditing or notifications:

```morph
subscriber logTodoEvents "Log todo events for auditing."
    on TodoCreated, TodoCompleted, TodoDeleted
```

See [Domain Events](domain-events.md) for how events differ from operation replay.

## Invariants

An **invariant** is a rule that must always hold. Morph invariants are boolean conditions checked before or after operations. They have several scopes:

**Entity-scoped** — rules about a specific entity:

```morph
invariant UserOwnsTodo on Todo
    "User can only modify their own todos."
    violation "You can only modify your own todos"
    where todo.userId == context.currentUser.id
```

**Context-scoped** — rules about the request context (authentication, authorization):

```morph
@context
invariant UserIdMatchesCurrentUser
    "Operation userId must match the authenticated user."
    violation "You must be authenticated as the specified user"
    where input.userId == context.currentUser.id
```

Operations reference invariants as pre-conditions (`pre`) or post-conditions (`post`):

```morph
command deleteTodo
    writes Todo
    pre UserOwnsTodo
    input { todoId: Todo.id }
```

When an invariant references `context.currentUser`, morph automatically infers that the operation requires authentication. See [Authorization](../design/authorization.md).

## Bounded Contexts

A **bounded context** is a linguistic boundary — the same word can mean different things in different contexts. In morph, `context` blocks group related entities, operations, and invariants:

```morph
context tasks "Task management." {
    entity Todo { ... }
    entity User { ... }
    command createTodo { ... }
    query listTodos { ... }
    invariant UserOwnsTodo { ... }
}

context orders "Order management." {
    depends on catalog
    entity Order { ... }
    command placeOrder { ... }
}
```

Each context gets its own generated packages (DSL, core, implementations). Cross-context dependencies are explicit via `depends on`.

## Ports and Contracts

**Ports** define dependency injection contracts for pluggable backends (storage, auth, cache). This is hexagonal architecture — the domain doesn't know about infrastructure:

```morph
port Cache<T> "Generic key-value cache." {
    get(key: string): T throws CacheMissError
    put(key: string, value: T): void
    remove(key: string): void
}
```

**Contracts** are property-based specifications that any port implementation must satisfy:

```morph
contract PutGetRoundTrip on Cache
    "Putting a value and getting it returns the same value."
    given key: string, value: T
    when put(key, value), get(key)
    then result == value
```

## How These Fit Together

A morph schema is a complete domain model:

```
context → entities + value objects + operations + invariants + ports
                          ↓
              commands (write, emit events)
              queries  (read only)
              functions (pure transforms)
                          ↓
              invariants enforce consistency
              events record what happened
              ports abstract infrastructure
```

The schema compiles to a JSON domain model, and morph's generators produce running code for each target (`@api`, `@cli`, `@mcp`, `@ui`) from that model.
