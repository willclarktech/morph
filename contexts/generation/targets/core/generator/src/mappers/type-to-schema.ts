import type { TypeRef } from "@morph/domain-schema";

/**
 * Convert a TypeRef to its Effect/Schema string representation.
 * Replicates logic from generator-types for standalone use.
 */
export const typeRefToSchema = (reference: TypeRef): string => {
	switch (reference.kind) {
		case "array": {
			return `S.Array(${typeRefToSchema(reference.element)})`;
		}

		case "entity": {
			return `${reference.name}Schema`;
		}

		case "entityId": {
			return `${reference.entity}IdSchema`;
		}

		case "function": {
			// Functions can't be validated at runtime, use S.Unknown
			return "S.Unknown";
		}

		case "generic": {
			// Generic instantiations can't be runtime schemas directly
			const args = reference.args.map(typeRefToSchema).join(", ");
			return `${reference.name}Schema /* generic: ${args} */`;
		}

		case "optional": {
			return `S.optional(${typeRefToSchema(reference.inner)})`;
		}

		case "primitive": {
			return primitiveToSchema(reference.name);
		}

		case "type": {
			return `${reference.name}Schema`;
		}

		case "typeParam": {
			// Type params can't be runtime schemas - return the name for interface-only generation
			return reference.name;
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
