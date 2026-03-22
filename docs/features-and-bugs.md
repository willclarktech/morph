# Features and Bugs in Morph

Morph defines domain systems through three pillars: **DSL** (operations and types), **invariants** (properties that must hold), and **examples** (concrete scenarios). Features and bugs are defined in terms of these pillars.

## What is a Feature?

A feature is an addition to the domain algebra:

| Pillar         | Addition                                      |
| -------------- | --------------------------------------------- |
| **DSL**        | New operations, types, entities, or errors    |
| **Invariants** | New properties the system must maintain       |
| **Examples**   | New scenarios demonstrating expected behavior |

A feature is complete when:

1. The DSL expresses the new capability
2. Invariants constrain valid states and transitions
3. Examples pass against all interpretations (@core, @cli, @api)

## What is a Bug?

A bug is a violation of the specification:

| Pillar         | Violation                                                   |
| -------------- | ----------------------------------------------------------- |
| **DSL**        | Implementation differs from declared signature or semantics |
| **Invariants** | A property that should hold but doesn't                     |
| **Examples**   | A scenario that should pass but fails                       |

### Bug Categories

**Invariant violation** — Property-based tests find counterexamples:

```
✗ TodoBelongsToUser: Every todo must belong to exactly one user
    Counterexample: { userId: "nonexistent-id", ... }
```

**Example failure** — Scenario tests fail:

```gherkin
Scenario: User creates a todo
  Given Taylor is a registered user
  When Taylor creates a todo "Buy milk"
  Then the todo should exist  # ← fails: todo not found
```

**Interpretation mismatch** — Same scenario passes @core but fails @cli:

- If @core passes, the domain logic is correct
- If @cli fails, the CLI generator or adapter has a bug

## Implications

### Adding a Feature

1. Define the DSL addition (schema change)
2. Specify invariants (property tests)
3. Write examples (scenarios)
4. Generate and implement until all tests pass

### Fixing a Bug

1. Identify which pillar is violated
2. Write a failing test that reproduces it (example or property)
3. Fix the implementation
4. Verify all pillars pass

### Refactoring

Refactoring changes implementation without changing behavior. After refactoring:

- All existing examples must still pass
- All invariants must still hold
- DSL signatures remain unchanged

If any of these break, it's not a refactor—it's a bug or a breaking change.
