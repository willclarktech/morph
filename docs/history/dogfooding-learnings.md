# Dogfooding Learnings

This document captures insights from the spike attempt to dogfood morph libs - generating morph's own libraries from its schema.

## What We Tried

Added an `auth` bounded context to `morph/schema.json` with:
- Types: `AuthConfig`, `LocalSession`
- Functions: `hashPassword`, `verifyPassword`, `readSession`, `writeSession`, `deleteSession`
- Errors: `AuthenticationError`, `AuthorizationError`, `PasswordHashError`, `PasswordVerifyError`, `SessionReadError`, `SessionWriteError`

The spike successfully generated:
- Auth types/errors in `libs/dsl/src/auth.ts`
- Auth operations in `libs/core/src/operations/` with handlers delegating to implementations
- Mock implementations using fast-check arbitraries

## What We Learned

### Generics Are a Prerequisite

> **Update:** Generics have been implemented. `TypeParameterDef` supports constraints and defaults, the DSL has `<T>` syntax, and generators emit generic schemas/interfaces. The table below is preserved as history.

The core blocker: **almost all hand-written libs use generics**, and the schema system cannot express type parameters.

| Package | Generic Usage |
|---------|---------------|
| `@morphdsl/operation` | `OperationDefinition<Params, Options, R>` |
| `@morphdsl/test` | `StepBuilder<TResult>`, `given<P, R>()` |
| `@morphdsl/scenario` | `Ref<T>` |
| `@morphdsl/property` | `OperationPropertySuite<I, O, C>` |
| `@morphdsl/auth` | `AuthService<TUser>` |
| `@morphdsl/auth-password` | `createAuthServicePassword<TUser>()` |

Without generics support, we can generate:
- Concrete types (no type parameters)
- Functions with concrete signatures
- Error classes

We cannot generate:
- Generic interfaces like `AuthService<TUser>`
- Generic factory functions like `createAuthServicePassword<TUser>()`
- Type-safe DSL building blocks like `Ref<T>`, `StepBuilder<TResult>`

Generating only the non-generic parts creates an awkward split where the architectural interfaces remain hand-written while leaf functions are generated.

### Output Structure Considerations

Current behavior puts all contexts into single `libs/dsl/` and `libs/core/` packages. For multi-context dogfooding, per-context packages are preferred:

```
libs/auth-dsl/       # @morphdsl/auth-dsl
libs/auth-core/      # @morphdsl/auth-core
libs/generation-dsl/ # @morphdsl/generation-dsl (current @morphdsl/dsl)
libs/generation-core/# @morphdsl/generation-core (current @morphdsl/core)
```

Benefits:
- Clear boundaries between concerns
- Consumers can import selectively
- Matches how real apps organize bounded contexts

### Interface vs Implementation Separation

Auth has a natural interface/implementation split:
- `@morphdsl/auth` - Generic interface (`AuthService<TUser>`) + error types
- `@morphdsl/auth-password` - Password-based implementation
- Future: `@morphdsl/auth-jwt`, `@morphdsl/auth-bearer`, etc.

This maps well to schema contexts with dependencies:
```
auth (interface context) → auth-password (implementation context)
```

But this requires generics to express `AuthService<TUser>`.

### Some Libs Are Language Primitives

Not all libs are candidates for generation. Some define the DSL itself:
- `@morphdsl/operation` - defines what an operation IS
- `@morphdsl/scenario` - defines what a Ref IS
- `@morphdsl/test` - defines how tests work

These are language primitives, not domain data. They arguably SHOULD be hand-written.

The auth libs are different - they're domain-driven (authentication is a domain). They use generics because user types vary across applications.

## Path Forward

### Phase 1: Add Generics to Schema ✓

Done. `TypeParameterDef` with constraints/defaults, DSL `<T>` syntax, generators emit generic schemas/interfaces.

### Phase 2: Per-Context Output Structure ✓

Done. Per-context packages (`contexts/{name}/dsl`, `contexts/{name}/core`, `contexts/{name}/impls`) are the default output structure.

### Phase 3: Migrate Auth

1. Add `auth` context to schema with `AuthService<TUser>` generic interface
2. Add `auth-password` context for password implementation
3. Move implementation code from `libs/auth-password/` to `impls/auth-password/`
4. Generate new packages
5. Delete old hand-written packages

### Phase 4: Migrate Testing Libs

1. Add `operation` context for operation DSL
2. Add `test` context for BDD testing
3. Continue with remaining libs

## Decision: Accept Partial Dogfooding?

Alternative to the full generics path: accept that some libs stay hand-written.

Argument for: "DSL-defining" libs are language primitives, not domain data. `@morphdsl/operation`, `@morphdsl/scenario`, `@morphdsl/test` define *what morph is*, not *what it operates on*.

Argument against: The auth libs ARE domain-driven, and not being able to generate them limits dogfooding value.

Current recommendation: Invest in generics support. It's a prerequisite for meaningful dogfooding and also makes morph more capable for users who need generic types in their domains.
