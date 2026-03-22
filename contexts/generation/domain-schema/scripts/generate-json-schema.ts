/**
 * Generate JSON Schema file from DomainSchemaSchema
 *
 * Run with: bun scripts/generate-json-schema.ts
 */
import { domainSchemaJsonSchema } from "../src/json-schema";

const outputPath = new URL("../domain-schema.json", import.meta.url).pathname;

await Bun.write(
	outputPath,
	JSON.stringify(domainSchemaJsonSchema, undefined, "\t"),
);

console.info(`Generated JSON Schema at: ${outputPath}`);
