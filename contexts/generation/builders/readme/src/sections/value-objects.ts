/**
 * Generate value objects section.
 */
import type {
	QualifiedEntry,
	TypeRef,
	ValueObjectDef,
} from "@morph/domain-schema";

import { code, heading, table } from "../markdown";

/**
 * Options for generating value objects section.
 */
export interface ValueObjectsOptions {
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
 * Generate documentation for a single value object.
 */
const generateValueObject = (
	vo: QualifiedEntry<ValueObjectDef>,
	options: ValueObjectsOptions,
): string => {
	const voLevel = (options.headingLevel ?? 2) + 1;
	const lines: string[] = [];

	// Value object heading
	lines.push(heading(voLevel as 3 | 4, vo.name));

	// Description
	lines.push(vo.def.description);

	// Attributes table
	const attributes = Object.entries(vo.def.attributes);
	if (attributes.length > 0) {
		const rows = attributes.map(([name, attribute]) => [
			code(name),
			code(formatType(attribute.type)),
			attribute.optional ? "Yes" : "No",
			attribute.description,
		]);
		lines.push(table(["Attribute", "Type", "Optional", "Description"], rows));
	}

	return lines.join("\n\n");
};

/**
 * Generate the value objects section.
 */
export const valueObjects = (
	voList: readonly QualifiedEntry<ValueObjectDef>[],
	options: ValueObjectsOptions = {},
): string => {
	if (voList.length === 0) return "";

	const level = options.headingLevel ?? 2;
	const lines: string[] = [heading(level, "Value Objects")];

	for (const vo of voList) {
		lines.push(generateValueObject(vo, options));
	}

	return lines.join("\n\n");
};
