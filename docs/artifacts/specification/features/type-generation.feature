@core
Feature: Type Generation

  As a schema designer
  I want to generate types from my domain schema
  So that my domain concepts are expressed as type-safe code

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Sam generates types from a domain schema
    Given Sam has defined a schema with a Todo entity
    When Sam generates types from the schema
    Then types are generated for the Todo entity

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Aggregate roots have identity types
    Given Sam has defined Todo as an aggregate root
    When Sam generates types from the schema
    Then Todo has a distinct identity type

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Entity attributes become typed properties
    Given Sam has defined Todo with title and done attributes
    When Sam generates types from the schema
    Then Todo type has properties matching the schema attributes

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Constraints are preserved in generated types
    Given Sam has defined a title attribute with a non-empty constraint
    When Sam generates types from the schema
    Then the constraint is expressed in the generated type

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Collection attributes preserve element types
    Given Sam has defined a TodoList with a collection of Todo items
    When Sam generates types from the schema
    Then the collection type references the Todo type

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Optional attributes are marked as optional
    Given Sam has defined a dueDate as an optional attribute
    When Sam generates types from the schema
    Then dueDate is optional in the generated type

  # traces: Generate TypeScript types from schema
  @core
  Scenario: Union types express valid values
    Given Sam has defined priority as one of low, medium, or high
    When Sam generates types from the schema
    Then priority only accepts those specific values
