# Examples

## Define a new domain schema

**Persona**: Sam

**Narrative**: Sam starts a new todo application by defining its domain schema.

**Given**:

- Sam has morph installed
- No existing schema file exists

**When**: Sam creates a DomainSchema with a Todo entity and createTodo operation

**Then**:

- Schema is valid (passes parseSchema validation)
- Todo entity has id, title, and done attributes
- createTodo operation has title input and Todo output
- Schema can be passed to generators

**Implies persistence of**: schema.ts file with DomainSchema

**Suggested contexts**: @core, @schema

---

## Generate TypeScript types from schema

**Persona**: Sam

**Narrative**: Sam generates type definitions from the domain schema.

**Given**:

- Valid DomainSchema with Todo entity
- Todo has entityId attribute for id

**When**: Sam runs generateTypes with the schema

**Then**:

- GenerationResult contains files for branded IDs, entities, and schemas
- TodoId branded type is generated
- Todo interface has readonly id: TodoId, title: string, done: boolean
- Effect Schema validators are generated

**Implies persistence of**: types/ids.ts, types/entities.ts, types/schemas.ts

**Suggested contexts**: @core, @types

---

## Generate operations from schema

**Persona**: Sam

**Narrative**: Sam generates operation definitions and dependencies interface.

**Given**:

- Valid DomainSchema with createTodo and listTodos operations
- Operations are tagged with @cli

**When**: Sam runs generateOperations with the schema

**Then**:

- GenerationResult contains operation files, deps interface, mocks
- Each operation uses defineOperation with Effect Schema params
- Deps interface includes generateId and todoRepository
- Mock factory returns stub implementations

**Implies persistence of**: operations/\*.ts, interfaces/deps.ts, mocks/deps.ts

**Suggested contexts**: @core, @operations

---

## Generate CLI entry point

**Persona**: Sam

**Narrative**: Sam generates a CLI application from the domain schema.

**Given**:

- Valid DomainSchema with operations tagged @cli
- Core package path is "@todo/core"

**When**: Sam runs generateCliApp with schema and corePackagePath

**Then**:

- GenerationResult contains CLI entry point
- Entry imports operations from core package
- Entry uses createCli to wire operations
- CLI parses argv and dispatches to operations

**Implies persistence of**: src/index.ts

**Suggested contexts**: @core, @cli

---

## Generate Cucumber step definitions

**Persona**: Jordan

**Narrative**: Jordan generates test step definitions for BDD scenarios.

**Given**:

- Valid DomainSchema with operations tagged @core
- Core package path is "@todo/core"

**When**: Jordan runs generateSteps with schema and corePackagePath

**Then**:

- GenerationResult contains world, hooks, and step definitions
- CoreWorld class holds deps and test state
- Steps call operations through deps
- Hooks reset state between scenarios

**Implies persistence of**: steps/support/world.ts, steps/support/hooks.ts, steps/core/steps.ts

**Suggested contexts**: @core, @steps

---

## Scaffold a new monorepo

**Persona**: Sam

**Narrative**: Sam creates a new monorepo structure for a project.

**Given**:

- Sam wants to create a "todo" project
- Desired scope is "todo"

**When**: Sam runs scaffold.init with name and scope

**Then**:

- GenerationResult contains monorepo configuration files
- package.json has workspaces for config/_, libs/_, apps/\*
- .editorconfig and .gitignore are created
- config/tsconfig and config/eslint packages are scaffolded

**Implies persistence of**: package.json, .editorconfig, .gitignore, config/

**Suggested contexts**: @core, @scaffold

---

## Add a library package to monorepo

**Persona**: Sam

**Narrative**: Sam adds a core library package to the monorepo.

**Given**:

- Monorepo exists with "todo" scope
- Sam wants to add "todo-core" library

**When**: Sam runs scaffold.add with name "todo-core", scope "todo", type "lib"

**Then**:

- GenerationResult contains library package files
- libs/todo-core/package.json with @todo/todo-core name
- tsconfig.json extends shared config
- eslint.config.ts uses shared rules

**Implies persistence of**: libs/todo-core/

**Suggested contexts**: @core, @scaffold

---

## Add a CLI package to monorepo

**Persona**: Sam

**Narrative**: Sam adds a CLI application package that depends on the core library.

**Given**:

- Monorepo exists with "todo" scope and "todo-core" library
- Sam wants to add "todo-cli" application

**When**: Sam runs scaffold.add with name "todo-cli", scope "todo", type "cli", coreName "todo-core"

**Then**:

- GenerationResult contains CLI package files
- apps/todo-cli/package.json with bin entry
- package.json has dependency on @todo/todo-core
- eslint.config.ts uses CLI rules

**Implies persistence of**: apps/todo-cli/

**Suggested contexts**: @core, @scaffold

---

## Run morph CLI to generate types

**Persona**: Taylor

**Narrative**: Taylor uses the morph CLI to generate types from a schema file.

**Given**:

- morph CLI is installed
- schema.ts exports a valid DomainSchema

**When**: Taylor runs `morph generateTypes schema.ts`

**Then**:

- CLI parses positional schema argument
- Generator reads and validates schema
- Generated files are printed to stdout as JSON
- Exit code is 0

**Implies persistence of**: (stdout only, files not written by CLI)

**Suggested contexts**: @cli

---

## Taylor implements operation handler

**Persona**: Taylor

**Narrative**: Taylor implements the createTodo operation using generated types.

**Given**:

- Generated types exist with Todo interface and TodoId
- Generated deps interface requires todoRepository
- Generated operation stub exists for createTodo

**When**: Taylor implements createTodo.execute to create and save a Todo

**Then**:

- Implementation uses deps.generateId() for new TodoId
- Implementation calls deps.todoRepository.save()
- Return type matches generated Todo interface
- TypeScript compilation succeeds

**Implies persistence of**: operations/createTodo.ts implementation

**Suggested contexts**: @core, @implementation

---

## Jordan writes feature file using generated steps

**Persona**: Jordan

**Narrative**: Jordan writes a Cucumber feature file that uses generated step definitions.

**Given**:

- Generated @core step definitions exist
- Steps include "When I create a todo titled {string}"
- World provides deps with in-memory repository

**When**: Jordan writes a feature with "When I create a todo titled 'Buy milk'"

**Then**:

- Step matches generated pattern
- createTodo operation is called with title "Buy milk"
- Result is stored in world.lastResult
- Scenario passes when run with cucumber-js

**Implies persistence of**: features/todo.feature

**Suggested contexts**: @core, @bdd

---

## Morgan adds new generator to morph

**Persona**: Morgan

**Narrative**: Morgan extends morph with a new API generator.

**Given**:

- morph schema defines generate operations
- New generator-api package is needed
- API generator should produce Bun.serve() routes

**When**: Morgan creates generator-api with generate function

**Then**:

- generate(schema) returns GenerationResult with route files
- Operations tagged @api become route handlers
- Routes parse params from URL/body
- Morgan adds operation to morph-core and updates CLI

**Implies persistence of**: morph/modules/generator-api/

**Suggested contexts**: @core, @dogfooding

---

## Schema validation catches invalid entity reference

**Persona**: Sam

**Narrative**: Sam's schema references a non-existent entity, and validation catches it.

**Given**:

- Sam creates DomainSchema with createTodo operation
- Output type references entity "Task" instead of "Todo"
- No "Task" entity exists in schema

**When**: Sam calls parseSchema on the schema

**Then**:

- Validation fails with descriptive error
- Error identifies the invalid entity reference
- Sam corrects "Task" to "Todo"
- Corrected schema passes validation

**Implies persistence of**: (no persistence, validation error)

**Suggested contexts**: @core, @validation
