# Modeling by Example

## Overview

Domain schemas include **examples** that demonstrate operations in context. These examples serve dual purposes:

1. **Specification** - Executable documentation of expected behavior
2. **Test generation** - Source for Gherkin feature files and step definitions

## Design Principles

### Examples are algebraic, not narrative

The domain schema formalizes the **algebra** of a system: types, operations, and invariants. Examples demonstrate how operations compose to achieve outcomes. They are not user stories or narrative documentation.

**Good**: Example shows operation composition and expected results
**Bad**: Example includes persona backstory or motivation

### Step text is self-documenting

All data relevant to a step should appear in the step text itself. Bindings map step parameters to operation arguments but should not introduce hidden data.

```json
// Good - all data visible in step text
{
    "text": "Taylor is a registered user with email \"taylor@test.com\"",
    "binding": {
        "kind": "operation",
        "name": "createUser",
        "args": {
            "name": "$name",
            "email": "$text"
        }
    }
}

// Bad - data hidden in binding
{
    "text": "Taylor is a registered user",
    "binding": {
        "kind": "operation",
        "name": "createUser",
        "args": {
            "name": "Taylor",
            "email": "taylor@test.com"
        }
    }
}
```

### Parameter extraction

Step text parameters are extracted and available to bindings via `$paramName`:

| Pattern           | Extracted as           | Example                |
| ----------------- | ---------------------- | ---------------------- |
| `"quoted string"` | `$text`, `$text2`, ... | `"Buy milk"` → `$text` |
| `{explicit}`      | `$explicit`            | `{email}` → `$email`   |
| `Capitalized`     | `$name`, `$name2`, ... | `Taylor` → `$name`     |
| `$123.45`         | `$amount`              | `$19.99` → `$amount`   |
| `123`             | `$count`               | `42` → `$count`        |

## Personas and the Schema

### Where personas belong

Personas are **discovery artifacts**, not schema components. The modeling workflow:

```
Discovery → Personas, user stories, domain concepts
    ↓
Crystallization → Domain schema (algebra)
    ↓
Generation → Types, operations, tests
```

Personas inform what examples to write, but they don't appear in the schema's algebraic structure.

### Why not include personas in the schema?

1. **Separation of concerns** - The schema formalizes domain algebra. Personas describe users, which is requirements/UX territory.

2. **Clean modeling** - Including personas would require:
   - Persona definitions with default attributes
   - Implicit fixture creation
   - Magic references like `$persona`

   This adds complexity without algebraic value.

3. **Self-documenting examples** - When personas are embedded, step text becomes incomplete:

   ```gherkin
   Given Taylor is a registered user  # Where does email come from?
   ```

   With explicit data, examples are complete specifications:

   ```gherkin
   Given Taylor is a registered user with email "taylor@test.com"
   ```

### Names in step text

Names like "Taylor" in step text are **identifiers**, not persona references. They:

- Make steps readable ("Taylor creates a todo" vs "the user creates a todo")
- Get extracted as the `$name` parameter
- Have no special meaning beyond being a string value

The `persona` field on examples is metadata for documentation and organization, not for code generation.

## Example Structure

A well-formed example:

```json
{
	"name": "Create and complete a todo",
	"narrative": "A user creates a todo and marks it complete.",
	"persona": "Taylor",
	"tags": ["@core"],
	"steps": {
		"given": [
			{
				"text": "Taylor is a registered user with email \"taylor@test.com\"",
				"binding": {
					"kind": "operation",
					"name": "createUser",
					"args": { "name": "$name", "email": "$text" },
					"output": "userId"
				}
			}
		],
		"when": [
			{
				"text": "Taylor creates a todo \"Buy milk\"",
				"binding": {
					"kind": "operation",
					"name": "createTodo",
					"args": { "title": "$text", "userId": "$userId" },
					"output": "todoId"
				}
			}
		],
		"then": [
			{
				"text": "the todo should exist with title \"Buy milk\"",
				"binding": {
					"kind": "assertion",
					"subject": "$lastResult",
					"field": "title",
					"assertion": "toBe",
					"expected": "Buy milk"
				}
			}
		]
	}
}
```

## Generated Output

From well-formed examples, generators produce:

**Feature file** (`*.feature`):

```gherkin
Feature: Create and complete a todo

  @core
  Scenario: Create and complete a todo
    Given Taylor is a registered user with email "taylor@test.com"
    When Taylor creates a todo "Buy milk"
    Then the todo should exist with title "Buy milk"
```

**Step definitions** (`steps.ts`):

```typescript
Given("Taylor is a registered user with email {string}", async function (text) {
	// name extracted from "Taylor", email from quoted string
	const result = await this.runEffect(
		createUser.execute({ name: "Taylor", email: text }, {}),
	);
	this.fixtures.userId = result.id;
});
```
