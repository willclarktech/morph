# Proto

Generates Protocol Buffer message definitions and field mappings from the domain schema. Enables protobuf encoding as an alternative wire format.

## What It Generates

| File | Purpose |
|------|---------|
| `src/domain.proto` | Protobuf message definitions for all entities |
| `src/proto-map.ts` | Operation-to-message field mapping |
| `src/date-fields.ts` | Date type handling between proto and domain types |
| `src/index.ts` | Barrel export |

## Schema Triggers

- **Conditional:** only generated when `extensions.encoding.formats` includes `"protobuf"`
- Generates messages for all entities across all contexts
- Field mappings cover all operations that reference proto-encoded types

## Example

### Schema Input

```morph
entity Todo {
  completed Boolean
  createdAt String
  dueDate   Date?
  priority  "low" | "medium" | "high"
  tags      String[]
  title     String
  userId    UserId
}

extensions {
  encoding { formats: ["json", "protobuf"] }
}
```

### Generated Output

**domain.proto:**

```protobuf
syntax = "proto3";
package todo_app;

message Todo {
  string id = 1;
  bool completed = 2;
  string createdAt = 3;
  string dueDate = 4;
  int32 priority = 5;
  repeated string tags = 6;
  string title = 7;
  string userId = 8;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string passwordHash = 4;
}
```

**proto-map.ts:**

```typescript
export const protoMap = {
  createTodo: { message: "Todo", fields: ["title", "userId", "priority", "tags", "dueDate"] },
  completeTodo: { message: "Todo", fields: ["todoId"] },
  // ...
};
```
