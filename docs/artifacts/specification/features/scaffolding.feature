@core
Feature: Project Scaffolding

  As a schema designer
  I want to scaffold new projects and packages
  So that I have a consistent structure to build on

  # traces: Scaffold a new monorepo
  @core
  Scenario: Sam scaffolds a new monorepo
    Given Sam wants to create a new domain application
    When Sam scaffolds a monorepo with a name and scope
    Then a workspace structure is created

  # traces: Scaffold a new monorepo
  @core
  Scenario: Monorepo supports multiple packages
    Given Sam has scaffolded a monorepo
    Then the workspace can contain libraries and applications

  # traces: Scaffold a new monorepo
  @core
  Scenario: Monorepo has shared configuration
    Given Sam has scaffolded a monorepo
    Then shared configuration packages are created
    And packages can extend the shared configuration

  # traces: Scaffold a new monorepo
  @core
  Scenario: Monorepo has consistent development settings
    Given Sam has scaffolded a monorepo
    Then consistent editor and version control settings are established

  # traces: Add a library package to monorepo
  @core
  Scenario: Sam adds a library package
    Given Sam has a monorepo
    When Sam adds a library package with a name
    Then the library is created in the appropriate location

  # traces: Add a library package to monorepo
  @core
  Scenario: Library packages extend shared configuration
    Given Sam has added a library package
    Then the library uses the shared TypeScript and lint configuration

  # traces: Add a CLI package to monorepo
  @core
  Scenario: Sam adds a CLI application package
    Given Sam has a monorepo with a core library
    When Sam adds a CLI application package
    Then the application is created with a dependency on core

  # traces: Add a CLI package to monorepo
  @core
  Scenario: CLI packages are executable
    Given Sam has added a CLI application package
    Then the package can be run as a command

  # traces: Add a CLI package to monorepo
  @core
  Scenario: CLI packages have appropriate lint rules
    Given Sam has added a CLI application package
    Then the package uses CLI-specific lint configuration
