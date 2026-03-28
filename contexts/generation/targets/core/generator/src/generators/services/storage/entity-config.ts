/**
 * EntityStoreConfig generator.
 * Generates config data per entity describing table name and indexes.
 */

import type { EntityDef, GeneratedFile } from "@morph/domain-schema";

import {
	getForeignKeyAttributes,
	getUniqueAttributes,
} from "@morph/domain-schema";
import { indent, toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Aggregate root entry with name and entity definition.
 */
interface AggregateRootEntry {
	readonly name: string;
	readonly def: EntityDef;
}

/**
 * Generate entity store configs for all aggregate roots.
 * Each config describes the entity name, table name, and secondary indexes.
 */
export const generateEntityConfigs = (
	aggregateRootEntries: readonly AggregateRootEntry[],
): GeneratedFile => {
	const configs = aggregateRootEntries.map((entry) => {
		const lower = entry.name.toLowerCase();
		const uniqueAttributes = getUniqueAttributes(entry.def);
		const foreignKeys = getForeignKeyAttributes(entry.def);

		const indexes = [
			...uniqueAttributes.map(
				(attribute) => `{ kind: "unique" as const, field: "${attribute}" }`,
			),
			...foreignKeys.map(
				(fk) => `{ kind: "nonUnique" as const, field: "${fk.name}" }`,
			),
		];

		const indexArray =
			indexes.length > 0 ? `[\n${indent(indexes.join(",\n"), 2)},\n\t]` : "[]";

		return `export const ${lower}StoreConfig: EntityStoreConfig = {
	entityName: "${lower}",
	tableName: "${lower}s",
	indexes: ${indexArray},
};`;
	});

	const content = `// Entity store configurations
// Do not edit - regenerate from schema

import type { EntityStoreConfig } from "@morph/storage-dsl";

${configs.join("\n\n")}
`;

	return { content, filename: "services/entity-configs.ts" };
};

/**
 * Generate a typed repository adapter wrapping EntityStore for a single aggregate root.
 * The adapter converts between string-based EntityStore and typed repository interface.
 */
export const generateRepositoryAdapter = (
	entityName: string,
	entityDef: EntityDef,
	typesImportPath: string,
): GeneratedFile => {
	const pascalName = toPascalCase(entityName);
	const kebabName = toKebabCase(entityName);
	const idType = `${pascalName}Id`;

	const uniqueAttributes = getUniqueAttributes(entityDef);
	const foreignKeys = getForeignKeyAttributes(entityDef);

	const typeImports = [pascalName, idType].join(", ");

	// Generate findBy methods for unique attributes
	const uniqueFindByMethods = uniqueAttributes.map((attributeName) => {
		const methodName = `findBy${toPascalCase(attributeName)}`;
		return `${methodName}: (${attributeName}) =>
		store.findByIndex("${attributeName}", ${attributeName}).pipe(
			Effect.map((d) => (d ? (jsonParse(d) as ${pascalName}) : undefined)),
			mapError,
		),`;
	});

	// Generate findAllBy methods for foreign keys
	const fkFindByMethods = foreignKeys.map((fk) => {
		const methodName = `findAllBy${toPascalCase(fk.name)}`;
		return `${methodName}: (${fk.name}, pagination) =>
		store.findAllByIndex("${fk.name}", ${fk.name}, pagination).pipe(
			Effect.map((result) => ({
				items: result.items.map((d: string) => jsonParse(d) as ${pascalName}),
				total: result.total,
			})),
			mapError,
		),`;
	});

	const findByMethods = indent(
		[...uniqueFindByMethods, ...fkFindByMethods].join("\n\n"),
		2,
	);

	const content = `// Generated ${pascalName} repository adapter
// Do not edit - regenerate from schema

import { Effect } from "effect";

import type { EntityStore } from "@morph/storage-dsl";
import { jsonParse, jsonStringify } from "@morph/utils";
import type { ${typeImports} } from "${typesImportPath}";

import { RepositoryError } from "./errors";
import type { ${pascalName}Repository } from "./${kebabName}-repository";

const mapError = Effect.mapError(
	(error: unknown) => new RepositoryError({ message: String(error) }),
);

/**
 * Create a typed ${pascalName}Repository from a generic EntityStore.
 */
export const create${pascalName}RepositoryAdapter = (
	store: EntityStore,
): ${pascalName}Repository => ({
	findById: (id: ${idType}) =>
		store.get(id).pipe(
			Effect.map((d) => (d ? (jsonParse(d) as ${pascalName}) : undefined)),
			mapError,
		),

${findByMethods}

	findAll: (pagination) =>
		store.getAll(pagination).pipe(
			Effect.map((result) => ({
				items: result.items.map((d: string) => jsonParse(d) as ${pascalName}),
				total: result.total,
			})),
			mapError,
		),

	save: (entity: ${pascalName}) =>
		store.put(entity.id, jsonStringify(entity)).pipe(mapError),

	delete: (id: ${idType}) => store.remove(id).pipe(mapError),
});
`;

	return { content, filename: `services/${kebabName}-repository-adapter.ts` };
};
