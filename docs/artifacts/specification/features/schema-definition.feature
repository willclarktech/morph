@core
Feature: Schema Definition

  As a schema designer
  I want to define and validate domain schemas
  So that I have a valid foundation for code generation

  # traces: Define a new domain schema
  @core
  Scenario: Sam defines a new domain schema
    Given Sam wants to describe a domain
    When Sam creates a schema with entities and operations
    Then the schema captures the domain structure

  # traces: Define a new domain schema
  @core
  Scenario: Schema includes entities with attributes
    Given Sam is defining a Todo entity
    When Sam adds title and done attributes
    Then the schema captures the entity structure

  # traces: Define a new domain schema
  @core
  Scenario: Schema includes operations with inputs and outputs
    Given Sam is defining a createTodo operation
    When Sam specifies input parameters and return type
    Then the schema captures the operation signature

  # traces: Define a new domain schema
  @core
  Scenario: Schema organizes concepts into contexts
    Given Sam has multiple related entities
    When Sam groups them into bounded contexts
    Then the schema reflects the domain boundaries

  # traces: Define a new domain schema
  @core
  Scenario: Schema defines vocabulary terms
    Given Sam wants to establish ubiquitous language
    When Sam adds vocabulary with definitions and aliases
    Then the schema captures the domain terminology

  # traces: Schema validation catches invalid entity reference
  @core
  Scenario: Sam validates a schema structure
    Given Sam has created a schema
    When Sam validates the schema
    Then structural errors are reported

  # traces: Schema validation catches invalid entity reference
  @core
  Scenario: Invalid type references are caught
    Given Sam has an operation referencing a non-existent entity
    When Sam validates the schema
    Then the invalid reference is reported

  # traces: Define a new domain schema
  @core
  Scenario: Schema includes invariants as business rules
    Given Sam has a business rule about Todo titles
    When Sam expresses it as an invariant
    Then the schema captures the rule

  # traces: Define a new domain schema
  @core
  Scenario: Schema includes examples for documentation
    Given Sam wants to illustrate domain behavior
    When Sam adds examples with Given-When-Then steps
    Then the schema captures executable examples
