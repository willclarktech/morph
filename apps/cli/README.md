# @morph/cli

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

```bash
# Run the CLI
bun run morph --help
```

## Environment Variables

| Variable          | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `MORPH_STORAGE`   | Storage backend: memory, jsonfile, sqlite, redis     |
| `MORPH_DATA_FILE` | Path for jsonfile storage (default: .test-data.json) |

## Operations

### `generate`

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

```bash
morph generate <name> <schema>
```

### `init`

Initialize a new morph monorepo scaffold

**Parameters:**

| Name   | Type     | Required | Description  |
| ------ | -------- | -------- | ------------ |
| `name` | `string` | Yes      | Project name |

**Returns:** `GenerationResult`

**Example:**

```bash
morph init <name>
```

### `newProject`

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

```bash
morph new-project <name> <schema>
```

### `validate`

Validate a domain schema

**Parameters:**

| Name     | Type     | Required | Description                                  |
| -------- | -------- | -------- | -------------------------------------------- |
| `schema` | `string` | Yes      | The domain schema as .morph DSL or JSON text |

**Returns:** `void`

**Errors:**

- `InvalidSchemaError`: The input schema is malformed

**Example:**

```bash
morph validate <schema>
```

### `decompileSchema`

Convert a domain schema JSON to .morph DSL text

**Parameters:**

| Name     | Type     | Required | Description                  |
| -------- | -------- | -------- | ---------------------------- |
| `schema` | `string` | Yes      | Domain schema as JSON string |

**Returns:** `string`

**Errors:**

- `InvalidSchemaError`: The input is not valid domain schema JSON

**Example:**

```bash
morph decompile-schema <schema>
```

### `formatDsl`

Format .morph DSL source text (parse and re-emit)

**Parameters:**

| Name     | Type     | Required | Description                          |
| -------- | -------- | -------- | ------------------------------------ |
| `source` | `string` | Yes      | The .morph DSL source text to format |

**Returns:** `string`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```bash
morph format-dsl <source>
```

### `parseMorph`

Parse and compile a .morph DSL source to domain schema JSON

**Parameters:**

| Name     | Type     | Required | Description                |
| -------- | -------- | -------- | -------------------------- |
| `source` | `string` | Yes      | The .morph DSL source text |

**Returns:** `ParseResult`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```bash
morph parse-morph <source>
```

### `validateDsl`

Validate a .morph DSL source file

**Parameters:**

| Name     | Type     | Required | Description                            |
| -------- | -------- | -------- | -------------------------------------- |
| `source` | `string` | Yes      | The .morph DSL source text to validate |

**Returns:** `void`

**Errors:**

- `ParseFailedError`: The source could not be parsed

**Example:**

```bash
morph validate-dsl <source>
```

### `templateSchema`

Get a template .morph schema showing all available DSL features and field types

**Returns:** `string`

**Example:**

```bash
morph template-schema
```

## Errors

| Error                | Description                    |
| -------------------- | ------------------------------ |
| `InvalidSchemaError` | The input schema is malformed  |
| `ParseFailedError`   | The source could not be parsed |
