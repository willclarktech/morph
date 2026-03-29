/**
 * Generate entities section.
 */
import type {
	EntityDef,
	QualifiedEntry,
	TypeRef,
} from "@morphdsl/domain-schema";

import { code, heading, table } from "../markdown";

/**
 * Options for generating entities section.
 */
export interface EntitiesOptions {
	/**
	 * Heading level for the section (default: 2).
	 */
	readonly headingLevel?: 2 | 3;
}

/**
 * Format a TypeRef as a readable string.
 */
const formatType = (type: TypeRef): string => {
	switch (type.kind) {
		case "array": {
			return `${formatType(type.element)}[]`;
		}
		case "entity": {
			return type.name;
		}
		case "entityId": {
			return `${type.entity}Id`;
		}
		case "function": {
			return "Function";
		}
		case "generic": {
			const args = type.args.map(formatType).join(", ");
			return `${type.name}<${args}>`;
		}
		case "optional": {
			return `${formatType(type.inner)}?`;
		}
		case "primitive": {
			return type.name;
		}
		case "type": {
			return type.name;
		}
		case "typeParam": {
			return type.name;
		}
		case "union": {
			return type.values.join(" | ");
		}
		case "valueObject": {
			return type.name;
		}
	}
};

/**
 * Generate documentation for a single entity.
 */
const generateEntity = (
	entity: QualifiedEntry<EntityDef>,
	options: EntitiesOptions,
): string => {
	const entityLevel = (options.headingLevel ?? 2) + 1;
	const lines: string[] = [];

	// Entity heading
	lines.push(heading(entityLevel as 3 | 4, entity.name));

	// Description
	lines.push(entity.def.description);

	// Attributes table
	const attributes = Object.entries(entity.def.attributes);
	if (attributes.length > 0) {
		const rows = attributes.map(([name, attribute]) => [
			code(name),
			code(formatType(attribute.type)),
			attribute.optional ? "Yes" : "No",
			attribute.description,
		]);
		lines.push(table(["Attribute", "Type", "Optional", "Description"], rows));
	}

	// Relationships
	if (entity.def.relationships.length > 0) {
		const relationshipRows = entity.def.relationships.map((relationship) => [
			relationship.kind,
			relationship.target,
			relationship.description,
		]);
		lines.push(
			table(["Relationship", "Target", "Description"], relationshipRows),
		);
	}

	return lines.join("\n\n");
};

/**
 * Generate the entities section.
 */
export const entities = (
	entityList: readonly QualifiedEntry<EntityDef>[],
	options: EntitiesOptions = {},
): string => {
	if (entityList.length === 0) return "";

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Entities")];

	for (const entity of entityList) {
		lines.push(generateEntity(entity, options));
	}

	return lines.join("\n\n");
};
