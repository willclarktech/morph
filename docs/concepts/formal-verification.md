# Formal Verification of Domain Invariants

## Overview

Morph generates SMT-LIB2 verification checks from the `ConditionExpr` / `ValueExpr` AST. These are solved by the Z3 CLI, providing exhaustive proofs that complement the probabilistic fast-check property tests.

```
ConditionExpr AST
  ├── compileTestCondition  → JavaScript    (fast-check, probabilistic)
  └── compileSmtCondition   → SMT-LIB2     (Z3 solver, exhaustive)
```

Same AST, different compilation backend.

## Architecture

The verification pipeline lives in `contexts/generation/targets/verification/generator/src/`:

| File | Role |
|------|------|
| `smt-compiler.ts` | Compiles `ConditionExpr` / `ValueExpr` to SMT-LIB2 strings |
| `declarations.ts` | Generates `declare-const` and sort declarations |
| `goals.ts` | Produces the three verification goals |
| `runner-gen.ts` | Generates the Z3 runner script |
| `generate.ts` | Main generator entry point |

Generated output per example project:

```
tests/verification/src/
  checks/
    consistency.smt2
    precondition-satisfiability.smt2
    preservation.smt2
  verify.ts
```

The runner shells out to Z3 with a 30-second timeout:

```typescript
const result = await $`z3 -T:30 ${check.file}`.quiet();
```

This sidesteps a Bun WASM compatibility issue with `z3-solver` (the npm package works in Node but crashes in Bun due to pthread/Worker assertion failures).

## Verification Goals

### 1. Consistency

Can all entity invariants hold simultaneously?

Asserts all invariants for an entity and checks `sat`. If `unsat`, the invariants contradict each other — no valid entity state exists.

### 2. Precondition satisfiability

Can each operation actually be invoked?

Asserts all preconditions (`pre` invariants) for an operation and checks `sat`. If `unsat`, the preconditions are contradictory — the operation is dead code in the schema.

### 3. Invariant preservation

Does executing an operation preserve entity invariants?

Asserts `preconditions ∧ postconditions ∧ ¬invariant` and checks `unsat`. If `unsat`, the invariant is preserved (no counterexample exists). If `sat`, Z3 produces a concrete witness showing how the operation can violate the invariant.

## Variable Auto-Declaration

The `SmtCollector` tracks variables encountered during compilation and auto-declares them:

| Source | SMT name pattern | Example |
|--------|-----------------|---------|
| Context fields | `ctx_X_Y` | `ctx_currentUser_role` |
| Input fields | `input_X` | `input_userId` |
| Entity fields | `entity_X` | `todo_completed` |
| String literals | `\|str_X\|` | `\|str_admin\|` |

Types map to SMT sorts: integer to `Int`, float to `Real`, boolean to `Bool`, everything else to `StringId` (uninterpreted sort). Unions map to `Int` with range constraints.

## Collection Bounds

Collections are bounded to **5 elements** (`COLLECTION_BOUND = 5`). For each array field, the compiler declares a `_len` variable plus `_0` through `_4` element variables. This keeps quantifiers bounded and the fragment decidable.

## SMT Fragment

### Current expressiveness

| Category | Nodes | SMT-LIB equivalent |
|----------|-------|---------------------|
| Comparisons | `equals`, `notEquals`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual` | `=`, `distinct`, `>`, `<`, `>=`, `<=` |
| Boolean | `and`, `or`, `not`, `implies` | `and`, `or`, `not`, `=>` |
| Quantifiers | `forAll`, `exists` | bounded — desugar to finite conjunction/disjunction |
| Collection | `contains`, `count` | `member` / `seq.len` |
| Values | `field`, `literal`, `variable`, `call` | constants, values, uninterpreted functions |

### Named fragment: QF_UFLIA with bounded quantifier macros

- **QF** — quantifier-free (our `forAll`/`exists` are bounded over finite collections, so they desugar to QF)
- **UF** — uninterpreted functions (`call` expressions: Z3 knows `f(a) = f(b)` if `a = b`, nothing else)
- **LIA** — linear integer arithmetic (comparisons and equality over integers)

This fragment is decidable — Z3 is guaranteed to terminate with a definitive answer.

### On quantifiers

The `forAll` and `exists` nodes look like logical quantifiers but function as collection predicates — they iterate over finite, known collections. They desugar to:

```
forAll(x in items: P(x))  →  P(items[0]) ∧ P(items[1]) ∧ ... ∧ P(items[n])
exists(x in items: P(x))  →  P(items[0]) ∨ P(items[1]) ∨ ... ∨ P(items[n])
```

This keeps the fragment quantifier-free (decidable). Unbounded quantifiers (`∀x ∈ ℤ`) would push into semi-decidable territory — avoid introducing those.

### Gap: missing ValueExpr kinds

Two `ValueExpr` kinds are not yet implemented:

| Node | Structure | SMT-LIB |
|------|-----------|---------|
| `arithmetic` | `{ op: "add" \| "sub" \| "mul" \| "mod", left, right }` | `+`, `-`, `*`, `mod` |
| `conditional` | `{ condition, then, else }` | `ite` |

The "linear" constraint — `mul` must have at least one constant operand — is enforced by validation, not by the grammar.

## Expression expansion guidelines

When proposing a new expression type, the review question is: **does this stay in QF_UFLIA (+ bounded quantifiers)?**

- Equality, ordering, linear arithmetic, uninterpreted functions, boolean logic: yes, freely add.
- Reals, difference logic, datatypes, strings: yes, each adds a decidable theory.
- Nonlinear integer arithmetic (`a * b` with two variables): no — semi-decidable.
- Unbounded quantifiers (`∀x ∈ ℤ`): no — semi-decidable.
- General recursion or arbitrary computation: no — undecidable.

### Adjacent fragments

| Fragment | Adds | Use case | Performance |
|----------|------|----------|-------------|
| QF_UFLRA | real arithmetic | money, percentages, `price * 0.9` | faster than LIA (no divisibility reasoning) |
| QF_IDL | integer difference logic (`x - y ≤ c` only) | temporal invariants (createdAt < updatedAt) | very fast |
| QF_UFDT | algebraic datatypes | enum/status exhaustiveness checking | fast |
| QF_SLIA | string operations | `length`, `startsWith`, `contains` on string fields | noticeably slower |
| QF_NIA | nonlinear integer arithmetic | `a * b` where both are variables | semi-decidable — avoid |

These compose freely via Nelson-Oppen theory combination. Z3 coordinates automatically.
