@core
Feature: End-to-End Workflow

  As a development team
  We want to use morph from schema to working application
  So that we can build domain-driven applications efficiently

  # traces: Define a new domain schema
  # traces: Generate TypeScript types from schema
  # traces: Generate operations from schema
  @core
  Scenario: Sam generates a complete domain library
    Given Sam has defined a schema with entities and operations
    When Sam generates types and operations from the schema
    Then a complete domain library is generated
    And the library has typed entities and operations

  # traces: Taylor implements operation handler
  @core
  Scenario: Taylor implements generated operations
    Given Sam has generated operations with stubs
    When Taylor implements the operation handlers
    Then the implementations use the generated types
    And the implementations receive dependencies correctly

  # traces: Generate Cucumber step definitions
  # traces: Jordan writes feature file using generated steps
  @core
  Scenario: Jordan tests using generated steps
    Given Jordan has generated step definitions
    And Taylor has implemented the operations
    When Jordan writes and runs a feature file
    Then the scenarios execute against the implementation

  # traces: Generate CLI entry point
  # traces: Run morph CLI to generate types
  @cli
  Scenario: End users interact via generated CLI
    Given Sam has generated a CLI application
    And Taylor has implemented the operations
    When an end user runs CLI commands
    Then the CLI executes operations and returns results

  # traces: Scaffold a new monorepo
  # traces: Add a library package to monorepo
  # traces: Add a CLI package to monorepo
  @core
  Scenario: Sam creates a complete project from scratch
    Given Sam has defined a domain schema
    When Sam scaffolds a monorepo and adds packages
    And Sam generates code into the packages
    Then a complete project structure exists
    And the packages have correct dependencies

  # traces: Morgan adds new generator to morph
  @core
  Scenario: Morgan extends morph with a new generator
    Given Morgan wants to add a new output format
    When Morgan creates a generator following morph patterns
    Then the generator transforms schemas to the new format
    And Morgan can add it to the morph CLI

  # traces: Schema validation catches invalid entity reference
  @core
  Scenario: Errors are caught before generation
    Given Sam has a schema with an error
    When Sam attempts to generate code
    Then the error is reported before generation starts
    And Sam can fix the schema and retry
