@core
Feature: CLI Application Generation

  As a schema designer
  I want to generate CLI applications from my schema
  So that users can interact with my domain via command line

  # traces: Generate CLI entry point
  @core
  Scenario: Sam generates a CLI application
    Given Sam has defined operations tagged for CLI
    When Sam generates a CLI application from the schema
    Then a CLI entry point is generated

  # traces: Generate CLI entry point
  @core
  Scenario: Generated CLI exposes schema operations as commands
    Given Sam has defined createTodo and listTodos operations
    When Sam generates a CLI application from the schema
    Then both operations are available as CLI commands

  # traces: Generate CLI entry point
  @core
  Scenario: Generated CLI uses operations from core package
    Given Sam has a core package with operations
    When Sam generates a CLI application referencing the core package
    Then the CLI uses operations from the core package

  # traces: Generate CLI entry point
  @core
  Scenario: Generated CLI accepts positional parameters
    Given Sam has defined an operation with required parameters
    When Sam generates a CLI application from the schema
    Then the CLI accepts parameters as positional arguments

  # traces: Generate CLI entry point
  @core
  Scenario: Generated CLI accepts named options
    Given Sam has defined an operation with optional parameters
    When Sam generates a CLI application from the schema
    Then the CLI accepts optional parameters as named options

  # traces: Generate CLI entry point
  @core
  Scenario: Generated CLI displays help for commands
    Given Sam has generated a CLI application
    When a user runs a command without required arguments
    Then the CLI displays usage information
