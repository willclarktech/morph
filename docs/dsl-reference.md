# .morph DSL Reference

The `.morph` DSL is the primary way to define domain schemas. This is the complete syntax reference.

## File Structure

A `.morph` file contains:

1. A `domain` declaration (required, exactly one)
2. An optional `extensions` block
3. An optional `profiles` block
4. One or more `context` blocks

```morph
domain MyApp

extensions { ... }

profiles { ... }

context orders "Order management" { ... }
context inventory "Inventory tracking" { ... }
```

## Domain

```morph
domain <Name>
```

Names the project. Used for package naming (e.g., `@myapp/orders-core`).

## Extensions

```morph
extensions {
  storage [memory, jsonfile, sqlite, redis, eventsourced] default memory
  auth [none, jwt, session, apikey, password] default jwt
  eventStore [memory, jsonfile, redis] default memory
  i18n [en, de, fr] base en
}
```

Each line declares an extension type with available options and a default. The `base` keyword is used for i18n's base language. The `eventsourced` storage backend derives entity state from the event store (see [Domain Events](./domain-events.md#event-sourcing)).

## Profiles

Profiles define named groups of tags, allowing operations to target multiple app targets with a single reference.

```morph
profiles {
  web: @cli @api @mcp
  full: @cli @api @mcp @ui @vscode
}
```

Each entry maps a profile name to one or more literal tags. Operations reference profiles with the `#` prefix:

```morph
#web
command createTodo "Create a new todo."
  writes Todo
  input { title: string }
  output Todo
```

`#web` expands to `@cli @api @mcp` during compilation. Generators receive the expanded `@` tags — no downstream changes needed.

- **`#name`** is always a profile reference
- **`@name`** is always a literal tag
- Profiles and literal tags can be mixed: `#web @ui`

## Context

```morph
context <name> "description" {
  depends on OtherContext, AnotherContext

  // entities, operations, invariants, subscribers, etc.
}
```

Groups related domain concepts. `depends on` declares cross-context dependencies.

## Entities

```morph
@root
entity Todo "A task to be completed." {
  title: string "The task title"
  completed: boolean "Whether the task is done"
  @sensitive
  apiKey?: string "Optional API key"

  belongs_to User "The owner"
  has_many Comment "Comments on this todo"
}
```

- **`@root`** — marks as aggregate root (required for at least one entity per context)
- **`?`** after attribute name — marks as optional
- Descriptions (quoted strings) are optional on all declarations

### Relationships

```morph
belongs_to <Entity> "description"
has_many <Entity> "description"
has_one <Entity> "description"
references <Entity> "description"
```

### Attribute Tags

- **`@sensitive`** — marks field as sensitive (excluded from logs, API responses)
- **`@unique`** — unique constraint

## Value Objects

```morph
value DueDate "A timezone-aware due date." {
  date: string "ISO date"
  timezone: string "IANA timezone"
}
```

Like entities but without identity or relationships. Used for complex attributes.

## Commands

Commands mutate state:

```morph
@cli @api @mcp
command createTodo "Create a new todo."
  writes Todo
  pre UserExists
  input {
    userId: User.id "The owner"
    title: string "The task title"
    dueDate?: DueDate "Optional due date"
  }
  output Todo
  emits TodoCreated "Emitted on creation"
  errors {
    UserNotFound "User does not exist" when "userId is invalid"
  }
```

### Clauses

All clauses are optional and can appear in any order:

| Clause | Syntax | Purpose |
|--------|--------|---------|
| `reads` | `reads Entity1, Entity2` | Entities read by this operation |
| `writes` | `writes Entity1` | Entities written by this operation |
| `pre` | `pre Invariant1, Invariant2` | Preconditions checked before execution |
| `post` | `post Condition1` | Postconditions checked after execution |
| `input` | `input { ... }` | Input parameters |
| `output` | `output Type` | Return type |
| `emits` | `emits Event1 "desc", Event2` | Domain events emitted |
| `errors` | `errors { ... }` | Possible error conditions |

### Tags

Tags control which app targets expose the operation:

| Tag | Target |
|-----|--------|
| `@api` | REST API routes |
| `@cli` | CLI commands |
| `@cli_client` | Client CLI (talks to API) |
| `@mcp` | MCP server tools |
| `@ui` | Web UI pages |
| `@vscode` | VS Code extension commands |

## Queries

Queries read state (same syntax as commands, minus `emits`):

```morph
@cli @api
query listTodos "List todos for a user."
  reads Todo
  input {
    userId: User.id "Filter by owner"
    includeCompleted?: boolean "Include completed todos"
  }
  output Todo[]
```

## Functions

Standalone functions without aggregate access:

```morph
function validateEmail "Check email format."
  input { email: string }
  output boolean
  errors { InvalidFormat "Email is malformed" }
```

## Invariants

Business rules that must hold:

```morph
invariant TodoBelongsToUser on Todo
  "A todo must belong to an existing user."
  violation "Todo does not belong to the specified user"
  where todo.userId == currentUser.id

@context
invariant UserIdMatchesCurrentUser
  "The userId in input must match the authenticated user."
  violation "Cannot create todos for other users"
  where input.userId == context.currentUser.id
```

- **`on Entity`** — scopes the invariant to an entity
- **`@context`** — operates on request context (auth, input) rather than entity state
- **`violation`** — error message when invariant is violated
- **`where`** — boolean condition expression

### Condition Expressions

```morph
where x == y                    // equality
where x != y                    // inequality
where x > 0 && y < 100         // logical AND with comparisons
where x || y                   // logical OR
where !deleted                 // negation
where list contains item       // membership
where exists x in items: x > 0 // existential
where forall x in items: x > 0 // universal
where if active then count > 0 // conditional
```

## Subscribers

React to domain events:

```morph
subscriber logTodoEvents "Log events for auditing"
  on TodoCreated, TodoCompleted, TodoDeleted
```

## Ports

Define abstract interfaces for infrastructure:

```morph
port StorageTransport<T> "Generic key-value storage" {
  get(key: string): T throws NotFoundError
  put(key: string, value: T): void
  remove(key: string): void throws NotFoundError
  getAll(): T[]
}
```

### Type Parameters

```morph
port Container<T, U: string, V = number> "Example" {
  process(input: T): U
}
```

- `T` — unbounded type parameter
- `U: string` — constrained to string
- `V = number` — default type

### Method Syntax

```morph
methodName(param: Type, other: Type): ReturnType throws Error1, Error2
```

## Contracts

Property-based tests for ports:

```morph
contract PutGetRoundTrip on StorageTransport "Put then get returns same value"
  given key: string, value: T
  when put(key, value), get(key)
  then result == value

contract RemoveThenGetFails on StorageTransport "Remove then get throws"
  given key: string, value: T
  when put(key, value), remove(key), get(key)
  then throws NotFoundError
```

## Types

Product types (structs):

```morph
type Address "A mailing address" {
  street: string
  city: string
  zip: string
  country: string
}
```

## Unions

Tagged unions (sum types):

```morph
union PaymentMethod by kind "How a customer pays" {
  creditCard "Pay by card" {
    last4: string
    expiry: string
  }
  bankTransfer "Pay by bank" {
    iban: string
  }
  cash
}
```

- **`by kind`** — specifies the discriminator field name

## Aliases

Type aliases:

```morph
alias Email = string
alias Optional<T> = T?
alias IdMap<K: string, V> = Map<K, V>
```

## Errors

Standalone error definitions:

```morph
error ValidationError "Input validation failed" {
  field: string "The invalid field"
  message: string "What went wrong"
}
```

## Type Expressions

| Syntax | Example | Description |
|--------|---------|-------------|
| Primitive | `string`, `integer`, `float`, `boolean`, `date`, `datetime`, `void` | Built-in types |
| Entity ref | `Todo`, `User` | Entity type |
| ID ref | `Todo.id`, `User.id` | Entity's branded ID type |
| Array | `Todo[]`, `string[]` | Array of type |
| Optional | `string?`, `Todo?` | Optional type |
| Literal union | `"active" \| "inactive"` | String literal union |
| Generic | `Map<string, number>` | Parameterized type |
| Function | `(x: string) => boolean` | Function type |
| Qualified | `OtherContext.Type` | Cross-context type reference |

## Comments

```morph
// This is a comment
domain MyApp // Inline comments work too
```

Only single-line comments (`//`) are supported.
