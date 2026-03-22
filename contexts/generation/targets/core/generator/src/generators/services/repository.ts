/**
 * Repository service interface generator.
 */

import type { EntityDef, GeneratedFile } from "@morph/domain-schema";

import {
	getForeignKeyAttributes,
	getUniqueAttributes,
} from "@morph/domain-schema";
import { toKebabCase, toPascalCase } from "@morph/utils";

/**
 * Generate TypeScript type for an attribute's type.
 */
export const getAttributeTypeString = (
	entityDef: EntityDef,
	attributeName: string,
): string => {
	const attribute = entityDef.attributes[attributeName];
	if (!attribute) return "unknown";

	const typeRef = attribute.type;
	switch (typeRef.kind) {
		case "array":
		case "entity":
		case "function":
		case "generic":
		case "optional":
		case "type":
		case "typeParam":
		case "union":
		case "valueObject": {
			return "unknown";
		}
		case "entityId": {
			return `${toPascalCase(typeRef.entity)}Id`;
		}
		case "primitive": {
			const map: Record<string, string> = {
				date: "string",
				datetime: "Date",
				float: "number",
				integer: "bigint",
			};
			return map[typeRef.name] ?? typeRef.name;
		}
	}
};

/**
 * Generate a repository service file for an aggregate root.
 */
export const generateRepositoryService = (
	entityName: string,
	entityDef: EntityDef,
	typesImportPath: string,
	projectName = "app",
): GeneratedFile => {
	const pascalName = toPascalCase(entityName);
	const kebabName = toKebabCase(entityName);
	const idType = `${pascalName}Id`;

	// Get unique attributes and foreign keys for findBy methods
	const uniqueAttributes = getUniqueAttributes(entityDef);
	const foreignKeys = getForeignKeyAttributes(entityDef);

	// Generate findBy method signatures for unique attributes
	const uniqueFindByMethods = uniqueAttributes.map((attributeName) => {
		const paramType = getAttributeTypeString(entityDef, attributeName);
		const methodName = `findBy${toPascalCase(attributeName)}`;
		return `\treadonly ${methodName}: (
		${attributeName}: ${paramType},
	) => Effect.Effect<${pascalName} | undefined, RepositoryServiceError>;`;
	});

	// Generate findAllBy method signatures for foreign keys
	const fkFindByMethods = foreignKeys.map((fk) => {
		const paramType = `${toPascalCase(fk.targetEntity)}Id`;
		const methodName = `findAllBy${toPascalCase(fk.name)}`;
		return `\treadonly ${methodName}: (
		${fk.name}: ${paramType},
		pagination?: PaginationParams,
	) => Effect.Effect<PaginatedResult<${pascalName}>, RepositoryServiceError>;`;
	});

	const findByMethodsCode = [...uniqueFindByMethods, ...fkFindByMethods].join(
		"\n",
	);

	// Collect additional type imports for foreign key types
	const fkTypeImports = foreignKeys
		.map((fk) => `${toPascalCase(fk.targetEntity)}Id`)
		.filter((t) => t !== idType);
	const typeImports = [pascalName, idType, ...new Set(fkTypeImports)].join(
		", ",
	);

	const content = `// Generated ${pascalName} repository service
// Do not edit - regenerate from schema

import { Context, Effect } from "effect";

import type { ${typeImports} } from "${typesImportPath}";

import type { RepositoryServiceError } from "./errors";

interface PaginationParams {
	readonly limit?: number;
	readonly offset?: number;
}

interface PaginatedResult<T> {
	readonly items: readonly T[];
	readonly total: number;
}

/**
 * Effect-based repository interface for ${pascalName} aggregate root.
 */
export interface ${pascalName}Repository {
	readonly findById: (
		id: ${idType},
	) => Effect.Effect<${pascalName} | undefined, RepositoryServiceError>;
${findByMethodsCode}
	readonly findAll: (
		pagination?: PaginationParams,
	) => Effect.Effect<PaginatedResult<${pascalName}>, RepositoryServiceError>;
	readonly save: (
		entity: ${pascalName},
	) => Effect.Effect<void, RepositoryServiceError>;
	readonly delete: (
		id: ${idType},
	) => Effect.Effect<void, RepositoryServiceError>;
}

/**
 * Context tag for ${pascalName} repository dependency injection.
 */
export const ${pascalName}Repository = Context.GenericTag<${pascalName}Repository>(
	"@${projectName}/${pascalName}Repository",
);
`;

	return { content, filename: `services/${kebabName}-repository.ts` };
};
