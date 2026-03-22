/**
 * JSON Schema generation for DomainSchema
 *
 * Generates a JSON Schema from the Effect Schema definition,
 * enabling IDE validation and autocompletion for domain schema files.
 */
import { JSONSchema } from "effect";

import { DomainSchemaSchema } from "./schemas";

/**
 * JSON Schema for DomainSchema.
 * Can be written to a file and referenced via $schema in JSON files.
 */
export const domainSchemaJsonSchema = JSONSchema.make(DomainSchemaSchema);
