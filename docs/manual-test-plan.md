# Morph Manual Test Plan

Manual verification of morph generation via the plugin system.

## Setup

```bash
cd /Users/admin/code/morph
bun install
```

---

## 1. Regenerate Examples

The primary test is regenerating all example applications from their schemas.

```bash
bun run generate:examples
```

**Verify:**

- [ ] No errors during generation
- [ ] All examples regenerated (todo-app, pastebin-app, code-generator, blog-app, generics-test)

---

## 2. Type Check Generated Code

```bash
bun run build:check
```

**Verify:**

- [ ] No type errors in generated code
- [ ] All 128+ packages compile successfully

---

## 3. Run Tests

```bash
bun run test
```

**Verify:**

- [ ] Scenario tests pass for all examples
- [ ] Property tests pass where applicable

---

## 4. Verify Generated Structure

Check that generated examples follow the context-centric structure.

### Todo App Structure

```bash
ls -la examples/todo-app/
```

Expected:

- [ ] `contexts/tasks/core/` - Generated core package
- [ ] `contexts/tasks/dsl/` - Generated DSL package
- [ ] `apps/cli/` - CLI application
- [ ] `apps/cli-client/` - CLI client (talks to API)
- [ ] `apps/api/` - API application
- [ ] `apps/mcp/` - MCP server
- [ ] `apps/ui/` - Web UI
- [ ] `libs/client/` - Client library

### Pastebin App Structure

```bash
ls -la examples/pastebin-app/
```

Expected:

- [ ] `contexts/pastes/core/` - Generated core package
- [ ] `contexts/pastes/dsl/` - Generated DSL package
- [ ] `apps/cli/`, `apps/api/`, `apps/ui/` - Applications (varies by schema tags)
- [ ] `libs/client/` - Client library (if `@cli_client` tagged)

---

## 5. Verify Core Package Contents

Check a generated core package for expected files.

```bash
ls examples/todo-app/contexts/tasks/core/src/
```

Expected:

- [ ] `operations/` - Operation modules with handlers
- [ ] `services/` - Service interfaces and implementations
- [ ] `layers.ts` - Layer compositions
- [ ] `index.ts` - Main barrel
- [ ] `test/scenarios.test.ts` - Scenario tests

### Operation Module Structure

```bash
ls examples/todo-app/contexts/tasks/core/src/operations/create-todo/
```

Expected:

- [ ] `index.ts` - Operation definition
- [ ] `handler.ts` - Handler interface
- [ ] `impl.ts` - Real implementation
- [ ] `mock-impl.ts` - Mock implementation for testing
- [ ] `impl.template.ts` - Template for custom implementation

---

## 6. Verify DSL Package Contents

```bash
ls examples/todo-app/contexts/tasks/dsl/src/
```

Expected:

- [ ] `schemas.ts` - Entity and value object schemas
- [ ] `errors.ts` - Domain error types
- [ ] `events.ts` - Domain event types (if events defined)
- [ ] `arbitraries.ts` - fast-check arbitraries for testing
- [ ] `prose.ts` - DSL prose definitions

---

## 7. Test Fixture Workflow

Verify that fixtures are correctly copied during generation.

### Fixtures Location

```bash
ls examples/fixtures/todo-app/
```

Expected:

- [ ] `schema.morph` - Domain schema
- [ ] `impls/` - Custom operation implementations
- [ ] `dsl/` - DSL fixtures (prose.ts)
- [ ] `scenarios/` - Test scenarios

### Fixture Application

After `generate:examples`, fixtures should be applied:

- [ ] `impls/*.ts` copied to `contexts/*/core/src/operations/*/impl.ts`
- [ ] `dsl/prose.ts` copied to `contexts/*/dsl/src/prose.ts`
- [ ] `scenarios/*.ts` copied to `tests/scenarios/`

---

## 8. Idempotency Check

Regeneration should be idempotent.

```bash
bun run generate:examples
bun run generate:examples
git diff examples/
```

**Verify:**

- [ ] No diff after second generation (output is deterministic)

---

## 9. Single Example Regeneration

Test regenerating a specific example.

```bash
bun scripts/generate-examples.ts todo-app
```

**Verify:**

- [ ] Only todo-app regenerated
- [ ] Other examples unchanged

---

## Cleanup

No cleanup needed - examples are committed to version control.

---

## Quick Smoke Test

One-liner to verify basic functionality:

```bash
bun run regenerate:morph && bun run generate:examples && bun run build:check && echo "SUCCESS"
```
