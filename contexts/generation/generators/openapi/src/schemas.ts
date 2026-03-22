import type { EntityDef, ValueObjectDef } from "@morph/domain-schema";

import type { OpenApiSchema } from "./mappers";

import { typeRefToOpenApiSchema } from "./mappers";

/**
 * Convert an entity definition to OpenAPI schema.
 */
export const entityToSchema = (
	_name: string,
	entity: EntityDef,
): OpenApiSchema => {
	const properties: Record<string, OpenApiSchema> = {
		id: { type: "string" },
	};
	const required: string[] = ["id"];

	for (const [attributeName, attributeDef] of Object.entries(
		entity.attributes,
	)) {
		if (attributeName === "id") continue;
		properties[attributeName] = typeRefToOpenApiSchema(attributeDef.type);
		if (!attributeDef.optional) {
			required.push(attributeName);
		}
	}

	return { properties, required, type: "object" };
};

/**
 * Convert a value object definition to OpenAPI schema.
 */
export const valueObjectToSchema = (vo: ValueObjectDef): OpenApiSchema => {
	const properties: Record<string, OpenApiSchema> = {};
	const required: string[] = [];

	for (const [attributeName, attributeDef] of Object.entries(vo.attributes)) {
		properties[attributeName] = typeRefToOpenApiSchema(attributeDef.type);
		required.push(attributeName);
	}

	return { properties, required, type: "object" };
};
