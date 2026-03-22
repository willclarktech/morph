import type { TypeRef } from "@morph/domain-schema";

/**
 * Convert a TypeRef to a Mermaid-compatible type string.
 */
export const toMermaidType = (typeRef: TypeRef): string => {
	switch (typeRef.kind) {
		case "array": {
			return `${toMermaidType(typeRef.element)}[]`;
		}
		case "entity": {
			return typeRef.name;
		}
		case "entityId": {
			return "string";
		}
		case "optional": {
			return toMermaidType(typeRef.inner);
		}
		case "primitive": {
			return typeRef.name;
		}
		case "type": {
			return typeRef.name;
		}
		case "union": {
			return "string";
		}
		case "valueObject": {
			return typeRef.name;
		}
		case "generic": {
			const args = typeRef.args.map(toMermaidType).join(", ");
			return `${typeRef.name}<${args}>`;
		}
		case "typeParam": {
			return typeRef.name;
		}
		case "function": {
			return "Function";
		}
	}
};
