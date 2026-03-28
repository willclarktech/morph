/**
 * TypeScript code generation utilities for DSL.
 */
import type { ParamDef, TypeRef } from "@morph/domain-schema";

import type { GeneratableDef } from "./type-collection";

/**
 * Convert a TypeRef to TypeScript type syntax.
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

/**
 * Generate TypeScript type for operation parameters.
 */
export const generateParametersType = (
	input: Record<string, ParamDef>,
): string => {
	const entries = Object.entries(input);
	if (entries.length === 0) return "Record<string, never>";

	const props = entries
		.map(([name, parameter]) => {
			const type = typeRefToTypeScript(parameter.type);
			const optional = parameter.optional ? "?" : "";
			return `${name}${optional}: ${type}`;
		})
		.join("; ");

	return `{ ${props} }`;
};

/**
 * Generate a DSL operation export.
 */
export const generateOperation = (
	name: string,
	def: GeneratableDef,
): string => {
	const paramsType = generateParametersType(def.input);
	const resultType = typeRefToTypeScript(def.output);

	// Single-line format for short lines, multi-line for longer ones (prettier print width is 80)
	const singleLine = `export const ${name} = defineOp<${paramsType}, ${resultType}>("${name}");`;
	if (singleLine.length <= 80) {
		return singleLine;
	}

	// Multi-line format for prettier compliance
	return `export const ${name} = defineOp<${paramsType}, ${resultType}>(
	"${name}",
);`;
};
