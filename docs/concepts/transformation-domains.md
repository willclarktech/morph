# Transformation Domains

Guide for building non-CRUD, transformation-centric schemas with morph.

## Overview

Traditional morph schemas are **entity-centric**: entities with identity, lifecycle, and persistence. This works great for CRUD applications (todo apps, CRMs, etc.).

**Transformation domains** are different:

- Pure functions (no side effects)
- Stateless operations (input → output)
- No entity lifecycle (no create/update/delete)
- No persistence (no repositories)

Examples: code generators, compilers, parsers, data transformers.

## Schema Structure

Transformation domains use `types` and `functions` instead of `entities` and `commands`:

```json
{
  "name": "my-generator",
  "contexts": {
    "generation": {
      "description": "Code generation operations",
      "types": { ... },
      "functions": { ... },
      "entities": {},
      "invariants": [],
      "dependencies": []
    }
  }
}
```

## Types

Pure algebraic data types without identity or lifecycle.

### Product Types (Records)

```json
{
	"GeneratedFile": {
		"kind": "product",
		"description": "A file produced by code generation",
		"fields": {
			"filename": {
				"description": "Relative path for the file",
				"type": { "kind": "primitive", "name": "string" }
			},
			"content": {
				"description": "File contents",
				"type": { "kind": "primitive", "name": "string" }
			}
		}
	}
}
```

**Generated:**

```typescript
export const GeneratedFileSchema = S.Struct({
	filename: S.String,
	content: S.String,
});
export type GeneratedFile = S.Schema.Type<typeof GeneratedFileSchema>;
```

### Sum Types (Discriminated Unions)

```json
{
	"Result": {
		"kind": "sum",
		"description": "Success or failure result",
		"discriminator": "kind",
		"variants": {
			"success": {
				"description": "Successful result",
				"fields": {
					"value": {
						"description": "The result value",
						"type": { "kind": "primitive", "name": "string" }
					}
				}
			},
			"error": {
				"description": "Error result",
				"fields": {
					"message": {
						"description": "Error message",
						"type": { "kind": "primitive", "name": "string" }
					}
				}
			}
		}
	}
}
```

**Generated:**

```typescript
export const ResultSchema = S.Union(
	S.Struct({ kind: S.Literal("success"), value: S.String }),
	S.Struct({ kind: S.Literal("error"), message: S.String }),
);
export type Result = S.Schema.Type<typeof ResultSchema>;
```

### Aliases

```json
{
	"FileList": {
		"kind": "alias",
		"description": "List of generated files",
		"type": {
			"kind": "array",
			"element": { "kind": "type", "name": "GeneratedFile" }
		}
	}
}
```

**Generated:**

```typescript
export const FileListSchema = S.Array(GeneratedFileSchema);
export type FileList = S.Schema.Type<typeof FileListSchema>;
```

## Functions

Pure transformations without side effects.

```json
{
	"functions": {
		"generateTypes": {
			"description": "Generate TypeScript types from domain schema",
			"input": {
				"schema": {
					"description": "The source schema",
					"type": { "kind": "type", "name": "DomainSchema" }
				}
			},
			"output": {
				"kind": "array",
				"element": { "kind": "type", "name": "GeneratedFile" }
			},
			"errors": [
				{
					"name": "InvalidSchema",
					"description": "Schema validation failed",
					"when": "schema is malformed"
				}
			],
			"tags": ["@cli"]
		}
	}
}
```

**Generated:**

```typescript
export const GenerateTypesInputSchema = S.Struct({
	schema: DomainSchemaSchema,
});
export type GenerateTypesInput = S.Schema.Type<typeof GenerateTypesInputSchema>;
export type GenerateTypesOutput = readonly GeneratedFile[];
export type GenerateTypesError = InvalidSchema;
```

### Differences from Commands

| Aspect     | Command                   | Function                  |
| ---------- | ------------------------- | ------------------------- |
| Events     | Emits domain events       | None (pure)               |
| Aggregates | Declares aggregate access | None (stateless)          |
| Pre/post   | Can have invariants       | None (types are contract) |
| Use case   | State changes             | Data transformation       |

## Hybrid Schemas

You can mix CRUD and transformation elements:

```json
{
  "contexts": {
    "reports": {
      "entities": {
        "Report": { ... }
      },
      "types": {
        "ReportOutput": { ... }
      },
      "commands": {
        "createReport": { ... }
      },
      "functions": {
        "formatReport": { ... }
      }
    }
  }
}
```

Use entities for things that need persistence; use types for intermediate data.

## Referencing Types

Use the `type` kind in TypeRef to reference a defined type:

```json
{ "kind": "type", "name": "GeneratedFile" }
{ "kind": "type", "name": "DomainSchema", "context": "schema" }
```

Cross-context references use the `context` field.

## Future Work

Features planned but not yet implemented:

| Feature                 | Description                         | Use Case              |
| ----------------------- | ----------------------------------- | --------------------- |
| **Generics**            | Type parameters like `Result<T, E>` | Polymorphic types     |
| **Streaming**           | `Stream<T>` for async iteration     | Large file generation |
| **Function types**      | `(A) => B` in TypeRef               | Callbacks, visitors   |
| **Function invariants** | Pre/post conditions on functions    | Formal verification   |

See [TODO.md](../../TODO.md) for the backlog.

## Example: Code Generator Schema

A complete transformation domain schema:

```json
{
	"$schema": "domain-schema.json",
	"name": "code-generator",
	"contexts": {
		"generation": {
			"description": "Code generation from schemas",
			"types": {
				"GeneratedFile": {
					"kind": "product",
					"description": "A generated source file",
					"fields": {
						"path": {
							"description": "File path",
							"type": { "kind": "primitive", "name": "string" }
						},
						"content": {
							"description": "File content",
							"type": { "kind": "primitive", "name": "string" }
						}
					}
				},
				"GenerationResult": {
					"kind": "sum",
					"description": "Generation outcome",
					"discriminator": "status",
					"variants": {
						"success": {
							"description": "Successful generation",
							"fields": {
								"files": {
									"description": "Generated files",
									"type": {
										"kind": "array",
										"element": { "kind": "type", "name": "GeneratedFile" }
									}
								}
							}
						},
						"failure": {
							"description": "Generation failed",
							"fields": {
								"errors": {
									"description": "Error messages",
									"type": {
										"kind": "array",
										"element": { "kind": "primitive", "name": "string" }
									}
								}
							}
						}
					}
				}
			},
			"functions": {
				"generate": {
					"description": "Generate code from input schema",
					"input": {
						"schema": {
							"description": "Input schema",
							"type": { "kind": "primitive", "name": "string" }
						},
						"options": {
							"description": "Generation options",
							"type": { "kind": "primitive", "name": "string" },
							"optional": true
						}
					},
					"output": { "kind": "type", "name": "GenerationResult" },
					"errors": [],
					"tags": ["@cli", "@api"]
				}
			},
			"entities": {},
			"invariants": [],
			"dependencies": []
		}
	}
}
```
