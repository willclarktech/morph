# Verification

Generates formal verification checks using SMT-LIB2 and Z3. Proves domain invariants are consistent and preconditions are satisfiable.

## What It Generates

| File | Purpose |
|------|---------|
| `src/verify.ts` | Z3 runner that executes checks and reports results |
| `src/checks/consistency.smt2` | Proves entity constraints don't contradict each other |
| `src/checks/precondition-satisfiability.smt2` | Proves each operation's preconditions can be satisfied |

## Schema Triggers

- **Conditional:** only generated when the schema has invariants or entity constraints
- One consistency check per entity
- One satisfiability check per operation with preconditions

## Example

### Schema Input

```morph
invariant TodoBelongsToUser {
  entity: Todo
  description: "Every todo must belong to exactly one user"
}

invariant UserOwnsTodo {
  entity: Todo
  description: "User can only modify their own todos"
}
```

### Generated Output

**consistency.smt2** (excerpt):

```smt2
(set-logic QF_UFLIA)
(declare-sort StringId 0)

; --- Entity: Todo ---
(push 1)
(echo "consistency:Todo")
(declare-const todo_completed Bool)
(declare-const todo_priority Int)
(assert (and (>= todo_priority 0) (< todo_priority 3)))
(declare-const todo_tags_len Int)
(assert (and (>= todo_tags_len 0) (<= todo_tags_len 5)))
(declare-const todo_title StringId)
(declare-const todo_userId StringId)
(check-sat)
(pop 1)
```

### Running It

```
$ bun run --filter @todo-app/verification verify

=== Formal Verification Results ===

[OK] consistency: sat (expected sat)
[OK] precondition-satisfiability: sat (expected sat)
[OK] precondition-satisfiability: sat (expected sat)
[OK] precondition-satisfiability: sat (expected sat)
[OK] precondition-satisfiability: sat (expected sat)
[OK] precondition-satisfiability: sat (expected sat)

6 passed, 0 failed, 0 unknown
```

## How It Works

1. Entity attributes are modeled as SMT constants with appropriate sorts
2. Invariant conditions are encoded as assertions
3. Z3 checks `sat` (satisfiable) — meaning the constraints are consistent and preconditions can be met
4. `unsat` would indicate contradictory constraints (a real bug in the schema)
5. Each check runs with a 30-second timeout

## Testing

Verification is a standalone check — run `bun run verify` in the `tests/verification/` package. There are no scenario or property runners for this target.
