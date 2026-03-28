import type { TypeRef } from "@morph/domain-schema";

/**
 * Convert a TypeRef to its TypeScript type string representation.
 */
export const typeRefToTypeScript = (reference: TypeRef): string => {
	switch (reference.kind) {
		case "array": {
			return `readonly ${typeRefToTypeScript(reference.element)}[]`;
		}

		case "entity": {
			return reference.name;
		}

		case "entityId": {
			return `${reference.entity}Id`;
		}

		case "function": {
			const params = reference.params
				.map((p) => `${p.name}: ${typeRefToTypeScript(p.type)}`)
				.join(", ");
			return `(${params}) => ${typeRefToTypeScript(reference.returns)}`;
		}

		case "generic": {
			const args = reference.args.map(typeRefToTypeScript).join(", ");
			return `${reference.name}<${args}>`;
		}

		case "optional": {
			return `${typeRefToTypeScript(reference.inner)} | undefined`;
		}

		case "primitive": {
			const primitiveMap: Record<string, string> = {
				boolean: "boolean",
				date: "string",
				datetime: "Date",
				float: "number",
				integer: "bigint",
				string: "string",
				unknown: "unknown",
				void: "void",
			};
			return primitiveMap[reference.name] ?? reference.name;
		}

		case "type": {
			return reference.name;
		}

		case "typeParam": {
			return reference.name;
		}

		case "union": {
			return reference.values.map((v) => `"${v}"`).join(" | ");
		}

		case "valueObject": {
			return reference.name;
		}

		default: {
			const _exhaustive: never = reference;
			return _exhaustive;
		}
	}
};
