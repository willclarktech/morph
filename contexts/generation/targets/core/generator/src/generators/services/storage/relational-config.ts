/**
 * Relational table config generator.
 * Emits RelationalTableConfig objects for SQLite relational storage.
 */

import type {
	DomainSchema,
	EntityDef,
	GeneratedFile,
} from "@morphdsl/domain-schema";

import {
	entityToFieldSpecs,
	entityToIndexSpecs,
	fieldSpecsToCodeString,
} from "./column-mapping";

interface AggregateRootEntry {
	readonly name: string;
	readonly def: EntityDef;
}

/**
 * Generate relational table configs for all aggregate roots.
 * Only emitted when SQLite storage is enabled.
 */
export const generateRelationalConfigs = (
	aggregateRootEntries: readonly AggregateRootEntry[],
	schema: DomainSchema,
): GeneratedFile => {
	const configs = aggregateRootEntries.map((entry) => {
		const lower = entry.name.toLowerCase();
		const fieldSpecs = entityToFieldSpecs(entry, schema);
		const indexSpecs = entityToIndexSpecs(entry);

		const fieldsCode = fieldSpecsToCodeString(fieldSpecs, "\t");
		const indexesCode =
			indexSpecs.length > 0
				? `[\n${indexSpecs.map((index) => `\t\t{ kind: "${index.kind}" as const, field: "${index.field}" }`).join(",\n")},\n\t]`
				: "[]";

		return `export const ${lower}RelationalConfig: RelationalTableConfig = {
	tableName: "${lower}s",
	fields: ${fieldsCode},
	indexes: ${indexesCode},
};`;
	});

	const content = `// Relational table configurations for SQLite storage
// Do not edit - regenerate from schema

import type { RelationalTableConfig } from "@morphdsl/storage-sqlite-impls";

${configs.join("\n\n")}
`;

	return { content, filename: "services/relational-configs.ts" };
};
