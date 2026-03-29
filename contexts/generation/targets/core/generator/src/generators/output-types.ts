import type { OperationDef, TypeRef } from "@morphdsl/domain-schema";

/**
 * Describe output type for TypeScript type annotation.
 */
export const describeOutput = (operation: OperationDef): string => {
	const { output } = operation;
	switch (output.kind) {
		case "array": {
			return `${describeTypeRef(output.element)}[]`;
		}
		case "entity": {
			return output.name;
		}
		case "entityId": {
			return `${output.entity}Id`;
		}
		case "function": {
			return "Function";
		}
		case "generic": {
			const argsString = output.args
				.map((a) => describeOutput({ output: a } as OperationDef))
				.join(", ");
			return `${output.name}<${argsString}>`;
		}
		case "optional": {
			return `${describeTypeRef(output.inner)} | undefined`;
		}
		case "primitive": {
			const map: Record<string, string> = {
				date: "Date",
				datetime: "Date",
				float: "number",
				integer: "bigint",
			};
			return map[output.name] ?? output.name;
		}
		case "type": {
			return output.name;
		}
		case "typeParam": {
			return output.name;
		}
		case "union": {
			return output.values.map((v) => `"${v}"`).join(" | ");
		}
		case "valueObject": {
			return output.name;
		}
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
};

const describeTypeRef = (reference: OperationDef["output"]): string =>
	describeOutput({ output: reference } as OperationDef);

/**
 * Collect entity and value object names from a TypeRef recursively.
 * Returns names that need Schema imports (for runtime use).
 */
export const collectSchemasFromTypeRef = (
	reference: TypeRef,
): readonly string[] => {
	switch (reference.kind) {
		case "array": {
			return collectSchemasFromTypeRef(reference.element);
		}
		case "entity": {
			return [reference.name];
		}
		case "entityId": {
			return [reference.entity + "Id"];
		}
		case "function":
		case "generic":
		case "primitive":
		case "type":
		case "typeParam":
		case "union": {
			return [];
		}
		case "optional": {
			return collectSchemasFromTypeRef(reference.inner);
		}
		case "valueObject": {
			return [reference.name];
		}
	}
};

/**
 * Collect entity names from a TypeRef recursively.
 * Returns names that need type imports (for type annotations).
 */
export const collectTypesFromTypeRef = (
	reference: TypeRef,
): readonly string[] => {
	switch (reference.kind) {
		case "array": {
			return collectTypesFromTypeRef(reference.element);
		}
		case "entity": {
			return [reference.name];
		}
		case "entityId":
		case "function":
		case "generic":
		case "primitive":
		case "type":
		case "typeParam":
		case "union": {
			return [];
		}
		case "optional": {
			return collectTypesFromTypeRef(reference.inner);
		}
		case "valueObject": {
			return [reference.name];
		}
	}
};

/**
 * Extract schema names from operation input that need value imports.
 */
export const extractInputSchemas = (
	operation: OperationDef,
): readonly string[] => {
	const schemas = Object.values(operation.input).flatMap((parameter) =>
		collectSchemasFromTypeRef(parameter.type),
	);
	return [...new Set(schemas)].toSorted();
};

/**
 * Extract entity names from operation output that need type imports.
 */
export const extractOutputTypes = (
	operation: OperationDef,
): readonly string[] => {
	const types = collectTypesFromTypeRef(operation.output);
	return [...new Set(types)].toSorted();
};
