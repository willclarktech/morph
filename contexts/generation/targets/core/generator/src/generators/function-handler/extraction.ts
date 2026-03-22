/**
 * Schema and type extraction from function definitions.
 */
import type { FunctionDef } from "@morph/domain-schema";

/**
 * Extract schema names from function input that need imports.
 */
export const extractFunctionInputSchemas = (
	function_: FunctionDef,
): readonly string[] => {
	const schemas = Object.values(function_.input).flatMap((parameter) =>
		collectFunctionSchemasFromTypeRef(parameter.type),
	);
	return [...new Set(schemas)].toSorted();
};

/**
 * Extract type names from function output.
 */
export const extractFunctionOutputTypes = (
	function_: FunctionDef,
): readonly string[] => {
	const types = collectFunctionTypesFromTypeRef(function_.output);
	return [...new Set(types)].toSorted();
};

/**
 * Collect schema names from TypeRef.
 */
export const collectFunctionSchemasFromTypeRef = (
	reference: FunctionDef["input"][string]["type"],
): readonly string[] => {
	switch (reference.kind) {
		case "array": {
			return collectFunctionSchemasFromTypeRef(reference.element);
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
		case "typeParam":
		case "union": {
			return [];
		}
		case "optional": {
			return collectFunctionSchemasFromTypeRef(reference.inner);
		}
		case "type": {
			return [reference.name];
		}
		case "valueObject": {
			return [reference.name];
		}
	}
};

/**
 * Collect type names from TypeRef for output.
 */
export const collectFunctionTypesFromTypeRef = (
	reference: FunctionDef["output"],
): readonly string[] => {
	switch (reference.kind) {
		case "array": {
			return collectFunctionTypesFromTypeRef(reference.element);
		}
		case "entity": {
			return [reference.name];
		}
		case "generic": {
			// Include the base type name for generic types like StepBuilder<T>
			return [reference.name];
		}
		case "entityId":
		case "function":
		case "primitive":
		case "typeParam":
		case "union":
		case "valueObject": {
			return [];
		}
		case "optional": {
			return collectFunctionTypesFromTypeRef(reference.inner);
		}
		case "type": {
			return [reference.name];
		}
	}
};
