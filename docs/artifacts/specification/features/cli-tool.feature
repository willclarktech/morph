@cli
Feature: Morph CLI Tool

  As an application developer
  I want to use the morph command-line tool
  So that I can generate code without writing scripts

  # traces: Run morph CLI to generate types
  @cli
  Scenario: Taylor runs morph without arguments
    Given Taylor has morph installed
    When Taylor runs morph without arguments
    Then morph displays available commands

  # traces: Run morph CLI to generate types
  @cli
  Scenario: Taylor runs a command with missing parameters
    Given Taylor has morph installed
    When Taylor runs a command without required parameters
    Then morph displays the required parameters

  # traces: Run morph CLI to generate types
  @cli
  Scenario: Taylor generates types via CLI
    Given Taylor has a valid schema file
    When Taylor runs morph to generate types from the schema
    Then types are generated successfully

  # traces: Run morph CLI to generate types
  @cli
  Scenario: Taylor generates operations via CLI
    Given Taylor has a valid schema file
    When Taylor runs morph to generate operations from the schema
    Then operations are generated successfully

  # traces: Scaffold a new monorepo
  @cli
  Scenario: Taylor scaffolds a monorepo via CLI
    Given Taylor wants to create a new project
    When Taylor runs morph to scaffold a monorepo
    Then a monorepo structure is created

  # traces: Add a library package to monorepo
  @cli
  Scenario: Taylor adds a package via CLI
    Given Taylor has a monorepo
    When Taylor runs morph to add a package
    Then the package is added to the monorepo
