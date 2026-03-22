@core
Feature: Step Definition Generation

  As a test engineer
  I want to generate step definitions from a domain schema
  So that I can write BDD tests using domain vocabulary

  # traces: Generate Cucumber step definitions
  @core
  Scenario: Jordan generates step definitions for testing
    Given Jordan has a schema with operations
    When Jordan generates step definitions from the schema
    Then step definitions are generated for the operations

  # traces: Generate Cucumber step definitions
  @core
  Scenario: Generated steps provide test context
    Given Jordan has generated step definitions
    When Jordan runs a scenario using those steps
    Then the test context provides access to dependencies

  # traces: Generate Cucumber step definitions
  @core
  Scenario: Generated steps maintain test state
    Given Jordan has generated step definitions
    When Jordan runs a scenario that calls an operation
    Then the operation result is stored in the test context

  # traces: Generate Cucumber step definitions
  @core
  Scenario: Test state is reset between scenarios
    Given Jordan has run a scenario that stored state
    When Jordan runs the next scenario
    Then the test context starts fresh

  # traces: Generate Cucumber step definitions
  @core
  Scenario: Steps can store entities for later assertions
    Given Jordan has generated step definitions
    When Jordan runs a scenario that creates entities
    Then the entities can be retrieved for assertions

  # traces: Jordan writes feature file using generated steps
  @core
  Scenario: Jordan uses generated steps in feature files
    Given Jordan has generated step definitions
    When Jordan writes a feature file using those steps
    Then the steps match and execute correctly

  # traces: Generate Cucumber step definitions
  @core
  Scenario: DSL steps are generated from schema examples
    Given Sam has defined examples with operation bindings in the schema
    When Jordan generates step definitions from the schema
    Then steps matching the example text are generated

  # traces: Generate CLI entry point
  @core
  Scenario: CLI steps are generated for integration testing
    Given Sam has a CLI application
    When Jordan generates CLI step definitions
    Then steps that invoke CLI commands are generated
