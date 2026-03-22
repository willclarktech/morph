/**
 * Type generation for function handler interfaces.
 */
import type { FunctionDef } from "@morph/domain-schema";

import { typeRefToTsType } from "../type-utilities";

/**
 * Generate params type for function handler interface.
 */
export const generateFunctionParametersType = (
	function_: FunctionDef,
): string => {
	const requiredParameters = Object.entries(function_.input).filter(
		([, parameter]) => parameter.optional !== true,
	);

	if (requiredParameters.length === 0) {
		return "Record<string, never>";
	}

	const fields = requiredParameters
		.map(
			([name, parameter]) =>
				`readonly ${name}: ${typeRefToTsType(parameter.type)}`,
		)
		.join("; ");

	return `{ ${fields} }`;
};

/**
 * Generate options type for function handler interface.
 */
export const generateFunctionOptionsType = (function_: FunctionDef): string => {
	const optionalParameters = Object.entries(function_.input).filter(
		([, parameter]) => parameter.optional === true,
	);

	if (optionalParameters.length === 0) {
		return "Record<string, never>";
	}

	const fields = optionalParameters
		.map(
			([name, parameter]) =>
				`readonly ${name}?: ${typeRefToTsType(parameter.type)} | undefined`,
		)
		.join("; ");

	return `{ ${fields} }`;
};

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
