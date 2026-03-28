/**
 * TypeRef to TypeScript type conversion utilities.
 */
import type { OperationDef } from "@morph/domain-schema";

/**
 * Convert TypeRef to TypeScript type string.
 */
export const typeRefToTsType = (
	reference: OperationDef["input"][string]["type"],
): string => {
	switch (reference.kind) {
		case "array": {
			return `readonly ${typeRefToTsType(reference.element)}[]`;
		}
		case "entity": {
			return reference.name;
		}
		case "entityId": {
			return `${reference.entity}Id`;
		}
		case "function": {
			const params = reference.params
				.map((p) => `${p.name}: ${typeRefToTsType(p.type)}`)
				.join(", ");
			return `(${params}) => ${typeRefToTsType(reference.returns)}`;
		}
		case "generic": {
			const argsString = reference.args.map(typeRefToTsType).join(", ");
			return `${reference.name}<${argsString}>`;
		}
		case "optional": {
			return `${typeRefToTsType(reference.inner)} | undefined`;
		}
		case "primitive": {
			const primitiveMap: Record<string, string> = {
				boolean: "boolean",
				date: "Date",
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
	}
};
