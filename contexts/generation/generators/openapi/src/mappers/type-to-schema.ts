import type { TypeRef } from "@morph/domain-schema";

/**
 * OpenAPI schema object (subset of JSON Schema).
 */
export interface OpenApiSchema {
	readonly $ref?: string;
	readonly enum?: readonly string[];
	readonly format?: string;
	readonly items?: OpenApiSchema;
	readonly nullable?: boolean;
	readonly oneOf?: readonly OpenApiSchema[];
	readonly properties?: Record<string, OpenApiSchema>;
	readonly required?: readonly string[];
	readonly type?:
		| "array"
		| "boolean"
		| "integer"
		| "number"
		| "object"
		| "string";
}

/**
 * Convert a domain schema TypeRef to an OpenAPI schema object.
 */
export const typeRefToOpenApiSchema = (ref: TypeRef): OpenApiSchema => {
	switch (ref.kind) {
		case "array": {
			return {
				items: typeRefToOpenApiSchema(ref.element),
				type: "array",
			};
		}

		case "entity": {
			return { $ref: `#/components/schemas/${ref.name}` };
		}

		case "entityId": {
			// Entity IDs are branded strings
			return { type: "string" };
		}

		case "optional": {
			const inner = typeRefToOpenApiSchema(ref.inner);
			return { ...inner, nullable: true };
		}

		case "primitive": {
			return primitiveToOpenApiSchema(ref.name);
		}

		case "type": {
			return { $ref: `#/components/schemas/${ref.name}` };
		}

		case "union": {
			return {
				enum: ref.values,
				type: "string",
			};
		}

		case "valueObject": {
			return { $ref: `#/components/schemas/${ref.name}` };
		}

		case "generic": {
			// Generic types can't be fully represented in OpenAPI, reference the base type
			return { $ref: `#/components/schemas/${ref.name}` };
		}

		case "typeParam": {
			// Type params can't be represented in OpenAPI, use object as fallback
			return { type: "object" };
		}

		case "function": {
			// Functions can't be represented in OpenAPI, use object as fallback
			return { type: "object" };
		}

		default: {
			const _exhaustive: never = ref;
			return _exhaustive;
		}
	}
};

/**
 * Convert a domain schema primitive type to OpenAPI schema.
 */
const primitiveToOpenApiSchema = (name: string): OpenApiSchema => {
	switch (name) {
		case "boolean": {
			return { type: "boolean" };
		}
		case "date": {
			return { format: "date", type: "string" };
		}
		case "datetime": {
			return { format: "date-time", type: "string" };
		}
		case "float": {
			return { type: "number" };
		}
		case "integer": {
			return { format: "int64", type: "integer" };
		}
		case "string": {
			return { type: "string" };
		}
		default: {
			return { type: "string" };
		}
	}
};
