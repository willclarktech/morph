# Formal Verification of Domain Invariants

## Context

Morph generates property-based test suites (fast-check) that verify invariants probabilistically — random inputs are sampled and checked against compiled conditions. Formal verification would complement this by proving invariant properties hold for *all* inputs, not just sampled ones.

## Approach: SMT Solving via Z3

The `ConditionExpr` / `ValueExpr` AST is a subset of first-order logic. An SMT (Satisfiability Modulo Theories) solver takes a set of logical constraints and either finds a satisfying assignment or proves none exists. Z3 is the standard solver, with TypeScript bindings via `z3-solver` on npm.

The architecture mirrors existing property test generation:

```
ConditionExpr AST
  ├── compileTestCondition  → JavaScript    (fast-check, probabilistic)
  └── compileZ3Condition    → Z3 formulas   (SMT solver, exhaustive)
```

Same AST, different compilation backend. Each `ConditionExpr` kind maps to a Z3 formula, each `ValueExpr` kind maps to a Z3 term.

### What SMT verification can prove

- **Invariant consistency** — can two invariants both hold simultaneously, or do they contradict?
- **Precondition satisfiability** — is it possible to actually invoke an operation, or are its preconditions unsatisfiable (dead code in the schema)?
- **Invariant preservation** — does `preconditions ∧ postconditions → invariant` hold universally?
- **Subsumption/redundancy** — does invariant A already imply invariant B?
- **Counterexample generation** — when verification fails, Z3 produces a concrete witness.

### Runtime compatibility

`z3-solver` uses WASM with pthreads. Verified 2024-03-23:
- **Node**: works correctly.
- **Bun**: crashes (pthread/Worker assertion failure in WASM instantiation).

Recommended approach: the `compileZ3Condition` compiler is pure TypeScript (Bun type-checks it). Only the solver invocation runs under Node. Alternatively, compile to SMT-LIB2 text and shell out to the `z3` CLI.

## SMT Fragment

### Current expressiveness

The invariant expression language currently covers:

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

### Gap to full QF_UFLIA

Two missing `ValueExpr` kinds:

| Node | Structure | SMT-LIB |
|------|-----------|---------|
| `arithmetic` | `{ op: "add" \| "sub" \| "mul" \| "mod", left, right }` | `+`, `-`, `*`, `mod` |
| `conditional` | `{ condition, then, else }` | `ite` |

The "linear" constraint — `mul` must have at least one constant operand — is enforced by validation, not by the grammar.

### Adjacent fragments

| Fragment | Adds | Use case | Performance |
|----------|------|----------|-------------|
| QF_UFLRA | real arithmetic | money, percentages, `price * 0.9` | faster than LIA (no divisibility reasoning) |
| QF_IDL | integer difference logic (`x - y ≤ c` only) | temporal invariants (createdAt < updatedAt) | very fast |
| QF_UFDT | algebraic datatypes | enum/status exhaustiveness checking | fast |
| QF_SLIA | string operations | `length`, `startsWith`, `contains` on string fields | noticeably slower |
| QF_NIA | nonlinear integer arithmetic | `a * b` where both are variables | semi-decidable — avoid |

These compose freely via Nelson-Oppen theory combination. Z3 coordinates automatically. Use whichever theory features a given invariant needs.

### On quantifiers

The `forAll` and `exists` nodes look like logical quantifiers but function as collection predicates — they iterate over finite, known collections. They desugar to:

```
forAll(x in items: P(x))  →  P(items[0]) ∧ P(items[1]) ∧ ... ∧ P(items[n])
exists(x in items: P(x))  →  P(items[0]) ∨ P(items[1]) ∨ ... ∨ P(items[n])
```

This keeps the fragment quantifier-free (decidable). Unbounded quantifiers (`∀x ∈ ℤ`) would push into semi-decidable territory — avoid introducing those.

An alternative framing renames these to `allMatch`/`anyMatch` to emphasize the collection-operation semantics over the logical-quantifier reading. The DSL surface syntax (`forall x in items: ...`) already reads computationally; the distinction is purely in the AST node naming.

## Expression expansion guidelines

When proposing a new expression type, the review question is: **does this stay in QF_UFLIA (+ bounded quantifiers)?**

- Equality, ordering, linear arithmetic, uninterpreted functions, boolean logic: yes, freely add.
- Reals, difference logic, datatypes, strings: yes, each adds a decidable theory.
- Nonlinear integer arithmetic (`a * b` with two variables): no — semi-decidable.
- Unbounded quantifiers (`∀x ∈ ℤ`): no — semi-decidable.
- General recursion or arbitrary computation: no — undecidable.
