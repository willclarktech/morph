# Personas

## Sam

**Role**: Schema designer who defines domain models for new applications

**Goals**:

- Express domain concepts in a formal schema that captures entities, operations, and invariants
- Generate complete applications (types, operations, CLI) from a single source of truth
- Iterate on schema design with rapid feedback from generated code

**Context**: Sam starts new projects by defining a DomainSchema. They think in terms of entities and operations, not implementation details. They expect generated code to follow best practices without manual intervention.

**Constraints**:

- Does not want to write boilerplate (types, deps interfaces, CLI parsing)
- Must learn the schema vocabulary to express domain concepts correctly
- Cannot preview generated code without running generators

---

## Taylor

**Role**: Application developer who builds features using generated code

**Goals**:

- Use generated types and operations to implement business logic
- Write tests using generated step definitions
- Extend generated code when custom behavior is needed

**Context**: Taylor receives generated code from Sam's schema. They implement operation handlers, wire up persistence, and add domain-specific logic. They run BDD tests to verify behavior.

**Constraints**:

- Must not modify generated files (they will be overwritten)
- Needs to understand the deps interface to provide implementations
- Works within the structure defined by the schema

---

## Morgan

**Role**: Framework maintainer who improves morph by using it to build itself

**Goals**:

- Dogfood morph by defining its own schema and generating code
- Identify missing features by experiencing pain points firsthand
- Evolve generators to support new use cases

**Context**: Morgan maintains morph itself. They define schemas for generator operations, use the CLI to test generation, and add new generator packages. They experience friction that regular users will encounter.

**Constraints**:

- Must maintain backward compatibility with existing schemas
- Cannot break the generation pipeline while improving it
- Experiences meta-complexity when morph generates morph code

---

## Jordan

**Role**: Test engineer who writes BDD scenarios for domain behavior

**Goals**:

- Write Gherkin feature files that exercise generated operations
- Use generated step definitions for consistent test vocabulary
- Verify behavior across execution environments (@core, @cli)

**Context**: Jordan writes feature files that test the domain. They use Given/When/Then steps that bind to operations. They run tests against both the pure library (@core) and the CLI (@cli).

**Constraints**:

- Must use step definitions that match the schema vocabulary
- Cannot test behavior not exposed through operations
- Needs working deps implementations to run @core tests
