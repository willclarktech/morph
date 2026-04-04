# Domain Events

This document explains the domain events system in morph - what it is, how it works, and how it differs from related concepts like operation replay.

## Overview

Domain events represent **significant occurrences in your domain** - things that happened that other parts of the system might care about. They enable:

- **Audit trails** - record of what happened and when
- **Decoupled features** - add notifications, analytics, etc. without modifying core operations
- **Cross-aggregate coordination** - react to changes in one aggregate from another
- **Testability** - assert that the right events were emitted

## Event Shape

Events are automatically derived from operations. When an operation executes successfully and has an `emits` declaration, an event is created with this shape:

```typescript
interface DomainEvent {
	readonly _tag: string; // Event name, e.g. "TodoCreated"
	readonly aggregateId: string; // Entity ID from result.id (or "" if no entity)
	readonly version: number; // Monotonic per aggregate
	readonly occurredAt: string; // ISO timestamp
	readonly params: unknown; // Original operation parameters
	readonly result: unknown; // Operation result
}
```

For example, when `createTodo({ title: "Buy milk", userId: "user-1" })` succeeds:

```typescript
{
  _tag: "TodoCreated",
  aggregateId: "todo-1",
  version: 1,
  occurredAt: "2024-01-15T10:30:00.000Z",
  params: { title: "Buy milk", userId: "user-1" },
  result: { id: "todo-1", title: "Buy milk", completed: false, ... }
}
```

The `aggregateId` is extracted from `result.id` (the root entity's ID). The `version` is computed by counting existing events for that aggregate and incrementing.

## The Three Event Services

The system has three distinct services for different purposes:

### 1. EventEmitter

**Purpose:** In-memory event collection for testing and introspection.

```typescript
interface EventEmitter {
	readonly emit: (event: DomainEvent) => Effect.Effect<void>;
}
```

Events are collected in memory and can be inspected. Useful for tests that want to verify events were emitted.

### 2. EventSubscriber

**Purpose:** React to events with handlers. Fire-and-forget semantics.

```typescript
interface EventSubscriber {
  // Typed subscribe methods per event type
  readonly subscribeToTodoCreated: (handler: (event: TodoCreatedEvent) => Effect.Effect<void>) => Effect.Effect<void>;
  readonly subscribeToTodoCompleted: (handler: ...) => Effect.Effect<void>;
  // ...

  // Publish an event to all subscribers
  readonly publish: (event: DomainEvent) => Effect.Effect<void>;
}
```

Subscribers are defined in the schema and wired up at application startup. Errors in subscribers are logged but don't fail the operation (fire-and-forget).

### 3. EventStore

**Purpose:** Durable, append-only event storage with query capabilities.

```typescript
interface EventStore {
	readonly append: (event: DomainEvent) => Effect.Effect<void, EventStoreError>;
	readonly getAll: () => Effect.Effect<readonly DomainEvent[], EventStoreError>;
	readonly getByTag: (tag: string) => Effect.Effect<readonly DomainEvent[], EventStoreError>;
	readonly getByAggregateId: (aggregateId: string) => Effect.Effect<readonly DomainEvent[], EventStoreError>;
	readonly getAfter: (timestamp: string) => Effect.Effect<readonly DomainEvent[], EventStoreError>;
}
```

Three backends are available:

- **memory** - In-memory, lost on restart (testing)
- **jsonfile** - Append to `.events.json` (local development)
- **redis** - Redis sorted set by timestamp (production)

## Event Flow

When an operation with `emits` executes successfully:

```
Operation executes
       ↓
Handler returns result
       ↓
Event created: { _tag, occurredAt, params, result }
       ↓
┌──────┴──────┬────────────────┐
↓             ↓                ↓
EventEmitter  EventSubscriber  EventStore
(collect)     (notify)         (persist)
```

All three happen automatically - you don't need to call them manually.

## CLI Flags

The CLI provides two independent flags for backend selection:

| Flag            | Purpose                   | Default  | Options                                          |
| --------------- | ------------------------- | -------- | ------------------------------------------------ |
| `--storage`     | Entity repository backend | `memory` | `memory`, `jsonfile`, `redis`, `eventsourced`    |
| `--event-store` | Event persistence backend | `memory` | `memory`, `jsonfile`, `redis`                    |

These are independent - you can mix and match:

```bash
# Entities in Redis, events in local file
todo --storage redis --event-store jsonfile create-todo ...

# Both in memory (testing)
todo create-todo ...

# Both in Redis (production)
todo --storage redis --event-store redis create-todo ...
```

## Schema Declaration

Events are declared inline on operations:

```json
{
  "operations": {
    "createTodo": {
      "description": "Create a new todo for a user.",
      "emits": {
        "name": "TodoCreated",
        "description": "Emitted when a new todo is created"
      },
      "input": { ... },
      "output": { ... }
    }
  }
}
```

Subscribers are declared at the context level:

```json
{
	"subscribers": {
		"logTodoEvents": {
			"description": "Log todo events for debugging",
			"events": ["TodoCreated", "TodoCompleted", "TodoDeleted"]
		}
	}
}
```

## Important Distinction: Domain Events vs Operation Replay

These are **two separate concepts** that can be confused in simple applications:

### Domain Events (what we have)

Events that represent **significant domain occurrences**. They are part of your domain model.

- "A todo was created"
- "A user signed up"
- "An order was shipped"

One operation might emit **multiple** domain events, and events can represent facts that go beyond "an operation was called."

Example of divergence:

```
Operation: TransferMoney(from: A, to: B, amount: 100)

Domain Events:
  - AccountDebited(account: A, amount: 100)
  - AccountCredited(account: B, amount: 100)
  - TransferCompleted(from: A, to: B, amount: 100)
```

### Operation Replay (separate concept, not implemented)

The ability to **re-execute commands** from a log. This is about operations/commands, not domain events.

- Store: `createTodo({ title: "Buy milk", userId: "user-1" })`
- Replay: Execute the same operation again

This would use the DSL to describe operations as data structures that can be stored and replayed. It's a separate track of work, deferred for now.

### Why the distinction matters

In a simple todo app, these overlap (1 operation → 1 event). But in richer domains:

| Aspect         | Domain Events                | Operation Replay              |
| -------------- | ---------------------------- | ----------------------------- |
| Represents     | What happened in the domain  | What commands were issued     |
| Granularity    | Can be finer than operations | 1:1 with operations           |
| Use case       | Audit, subscribers, CQRS     | Migrations, recovery, testing |
| Current status | ✅ Implemented (Phases 1-4)  | Deferred (Phase 7)            |

## Event Sourcing

The `eventsourced` storage backend derives entity state from event history. When configured, the storage transport reconstructs entities by reading events from the event store rather than maintaining separate entity storage.

```morph
extensions {
  storage [eventsourced] default eventsourced
  eventStore [memory, jsonfile] default memory
}
```

How it works:
- **Writes**: `repo.save()` updates a snapshot cache; events are appended by the wrapper
- **Reads**: `repo.findById()` reads events via `getByAggregateId()`, returns `result` from the latest event; falls back to snapshot cache
- **No user code needed**: Handlers remain unchanged. Event sourcing is a pure infrastructure concern.

Since events carry `result` (the full entity state after the handler ran), reconstruction is trivially `event.result`. No user-written apply/fold function is needed.

See the `ledger` example for a working event-sourced domain.

## Future Directions

### Testing Support (Phase 6 - not started)

Better testing utilities:

- `TestEventEmitter` with `getEvents()` for assertions
- Example patterns for event-based testing

### DSL Operation Replay (Phase 7 - deferred)

Storing and replaying DSL operation calls. Would enable:

- Command sourcing
- Scenario replay for testing
- Migration scripts

## Generated Files

For an app with events, these files are generated in `services/`:

| File                           | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `event-emitter.ts`             | EventEmitter interface                       |
| `event-emitter-inmemory.ts`    | In-memory implementation                     |
| `event-subscriber.ts`          | EventSubscriber interface with typed methods |
| `event-subscriber-registry.ts` | Registry implementation                      |
| `subscriber-bootstrap.ts`      | Wiring layer for startup                     |
| `event-store.ts`               | EventStore interface                         |
| `event-store-inmemory.ts`      | In-memory implementation                     |
| `event-store-jsonfile.ts`      | JSON file implementation                     |
| `event-store-redis.ts`         | Redis implementation                         |
| `event-store-registry.ts`      | Runtime backend selection                    |

Subscribers are generated in `subscribers/{name}/`:

| File       | Purpose                                  |
| ---------- | ---------------------------------------- |
| `index.ts` | Subscriber interface                     |
| `impl.ts`  | Scaffold implementation (hand-edit this) |
