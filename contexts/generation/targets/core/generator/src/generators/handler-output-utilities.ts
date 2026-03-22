/**
 * Output type utilities for handler generation (FunctionDef).
 */
import type { FunctionDef } from "@morph/domain-schema";

/**
 * Describe function output type for TypeScript type annotation.
 */
export const describeFunctionOutput = (function_: FunctionDef): string => {
	const { output } = function_;
	switch (output.kind) {
		case "array": {
			return `readonly ${describeFunctionTypeRef(output.element)}[]`;
		}
		case "entity": {
			return output.name;
		}
		case "entityId": {
			return `${output.entity}Id`;
		}
		case "generic": {
			const argsString = output.args
				.map((a) => describeFunctionOutput({ output: a } as FunctionDef))
				.join(", ");
			return `${output.name}<${argsString}>`;
		}
		case "optional": {
			return `${describeFunctionTypeRef(output.inner)} | undefined`;
		}
		case "primitive": {
			const map: Record<string, string> = {
				date: "string",
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
		case "function": {
			return "Function";
		}
		default: {
			const _exhaustive: never = output;
			return _exhaustive;
		}
	}
};

const describeFunctionTypeRef = (reference: FunctionDef["output"]): string =>
	describeFunctionOutput({ output: reference } as FunctionDef);

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
 * Collect type names from TypeRef for output.
 */
const collectFunctionTypesFromTypeRef = (
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
