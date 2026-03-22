@core
Feature: Operation Generation

  As a schema designer
  I want to generate operations from my domain schema
  So that domain actions are expressed as typed, validated functions

  # traces: Generate operations from schema
  @core
  Scenario: Sam generates operations from a domain schema
    Given Sam has defined a schema with a createTodo operation
    When Sam generates operations from the schema
    Then an operation is generated for createTodo

  # traces: Generate operations from schema
  @core
  Scenario: Operations have typed parameters
    Given Sam has defined createTodo with a title parameter
    When Sam generates operations from the schema
    Then createTodo accepts a title parameter

  # traces: Generate operations from schema
  @core
  Scenario: Operations have typed return values
    Given Sam has defined createTodo returning a Todo entity
    When Sam generates operations from the schema
    Then createTodo returns a Todo

  # traces: Generate operations from schema
  @core
  Scenario: Operations declare their dependencies
    Given Sam has defined operations that need repository access
    When Sam generates operations from the schema
    Then a dependencies definition is generated
    And operations receive dependencies when executed

  # traces: Generate operations from schema
  @core
  Scenario: Aggregate roots have repository dependencies
    Given Sam has defined Todo as an aggregate root
    When Sam generates operations from the schema
    Then a Todo repository is included in dependencies

  # traces: Generate operations from schema
  @core
  Scenario: Mock dependencies are generated for testing
    Given Sam has defined operations with dependencies
    When Sam generates operations from the schema
    Then mock implementations are generated for testing

  # traces: Generate operations from schema
  @core
  Scenario: Operations can declare errors
    Given Sam has defined getTodo with a TodoNotFound error
    When Sam generates operations from the schema
    Then getTodo declares TodoNotFound as a possible error

  # traces: Generate operations from schema
  @core
  Scenario: Operations can be filtered by tag
    Given Sam has defined operations with different tags
    When Sam generates operations for a specific tag
    Then only operations with that tag are generated
