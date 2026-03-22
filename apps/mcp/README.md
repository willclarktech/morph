# @Morph/mcp

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

```bash
# Run the MCP server
bun run start

# Or inspect with MCP Inspector
bun run inspect
```

## Tools

### Operations

#### `generate`

Generate all packages from a domain schema

**Parameters:**

| Name     | Type     | Required | Description                                  |
| -------- | -------- | -------- | -------------------------------------------- |
| `name`   | `string` | Yes      | Project name for package naming              |
| `schema` | `string` | Yes      | The domain schema as .morph DSL or JSON text |

**Returns:** `GenerationResult`

**Errors:**

- `InvalidSchemaError`: The input schema is malformed

**Example:**

```json
// Tool: generate
{ "name": "<value>", "schema": "<value>" }
```

#### `init`

Initialize a new morph monorepo scaffold

**Parameters:**

| Name   | Type     | Required | Description  |
| ------ | -------- | -------- | ------------ |
| `name` | `string` | Yes      | Project name |

**Returns:** `GenerationResult`

**Example:**

```json
// Tool: init
{ "name": "<value>" }
```

#### `newProject`

Create a new morph project (init + generate)

**Parameters:**

| Name     | Type     | Required | Description                                  |
| -------- | -------- | -------- | -------------------------------------------- |
| `name`   | `string` | Yes      | Project name                                 |
| `schema` | `string` | Yes      | The domain schema as .morph DSL or JSON text |

**Returns:** `GenerationResult`

**Errors:**

- `InvalidSchemaError`: The input schema is malformed

**Example:**

```json
// Tool: newProject
{ "name": "<value>", "schema": "<value>" }
```

#### `decompileSchema`

Convert a domain schema JSON to .morph DSL text

**Parameters:**

| Name     | Type     | Required | Description                  |
| -------- | -------- | -------- | ---------------------------- |
| `schema` | `string` | Yes      | Domain schema as JSON string |

**Returns:** `string`

**Errors:**

- `InvalidSchemaError`: The input is not valid domain schema JSON

**Example:**

```json
// Tool: decompileSchema
{ "schema": "<value>" }
```

#### `formatDsl`

Format .morph DSL source text (parse and re-emit)

**Parameters:**

| Name     | Type     | Required | Description                          |
| -------- | -------- | -------- | ------------------------------------ |
| `source` | `string` | Yes      | The .morph DSL source text to format |

**Returns:** `string`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```json
// Tool: formatDsl
{ "source": "<value>" }
```

#### `parseMorph`

Parse and compile a .morph DSL source to domain schema JSON

**Parameters:**

| Name     | Type     | Required | Description                |
| -------- | -------- | -------- | -------------------------- |
| `source` | `string` | Yes      | The .morph DSL source text |

**Returns:** `ParseResult`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```json
// Tool: parseMorph
{ "source": "<value>" }
```

#### `validateDsl`

Validate a .morph DSL source file

**Parameters:**

| Name     | Type     | Required | Description                            |
| -------- | -------- | -------- | -------------------------------------- |
| `source` | `string` | Yes      | The .morph DSL source text to validate |

**Returns:** `void`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```json
// Tool: validateDsl
{ "source": "<value>" }
```

#### `templateSchema`

Get a template .morph schema showing all available DSL features and field types

**Returns:** `string`

**Example:**

```json
// Tool: templateSchema
{}
```

## Errors

| Error                | Description                    |
| -------------------- | ------------------------------ |
| `InvalidSchemaError` | The input schema is malformed  |
| `ParseFailedError`   | The source could not be parsed |
