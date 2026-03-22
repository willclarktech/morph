import type { TypeRef } from "@morph/domain-schema";

/**
 * Context for schema generation with type parameter mappings.
 */
export interface SchemaContext {
	readonly typeParams?: Record<string, string>;
}

/**
 * Convert a TypeRef to its Effect/Schema string representation.
 */
export const typeRefToSchema = (
	reference: TypeRef,
	ctx: SchemaContext = {},
): string => {
	switch (reference.kind) {
		case "array": {
			return `S.Array(${typeRefToSchema(reference.element, ctx)})`;
		}

		case "entity": {
			return `${reference.name}Schema`;
		}

		case "entityId": {
			return `${reference.entity}IdSchema`;
		}

		case "generic": {
			const args = reference.args
				.map((arg) => typeRefToSchema(arg, ctx))
				.join(", ");
			return `${reference.name}Schema(${args})`;
		}

		case "optional": {
			return `S.optional(${typeRefToSchema(reference.inner, ctx)})`;
		}

		case "primitive": {
			return primitiveToSchema(reference.name);
		}

		case "type": {
			return `${reference.name}Schema`;
		}

		case "typeParam": {
			return ctx.typeParams?.[reference.name] ?? reference.name;
		}

		case "union": {
			const literals = reference.values
				.map((v) => `S.Literal("${v}")`)
				.join(", ");
			return `S.Union(${literals})`;
		}

		case "valueObject": {
			return `${reference.name}Schema`;
		}

		case "function": {
			// Functions can't be validated at runtime, use S.Unknown
			return "S.Unknown";
		}

		default: {
			const _exhaustive: never = reference;
			return _exhaustive;
		}
	}
};

const primitiveToSchema = (
	name:
		| "boolean"
		| "date"
		| "datetime"
		| "float"
		| "integer"
		| "string"
		| "unknown"
		| "void",
): string => {
	const map = {
		boolean: "S.Boolean",
		date: "S.DateFromSelf",
		datetime: "S.DateFromSelf",
		float: "S.Number",
		integer: "S.BigIntFromSelf",
		string: "S.String",
		unknown: "S.Unknown",
		void: "S.Void",
	} as const;
	return map[name];
};
