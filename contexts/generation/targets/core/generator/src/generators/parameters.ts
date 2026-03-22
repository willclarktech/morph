import type { ParamDef } from "@morph/domain-schema";

import { indent } from "@morph/utils";

import { parameterDefToSchema } from "../mappers";

/**
 * Split params into positional (required) and options (optional).
 */
export const splitParameters = (
	input: Readonly<Record<string, ParamDef>>,
): {
	readonly options: readonly [string, ParamDef][];
	readonly params: readonly [string, ParamDef][];
} => {
	const entries = Object.entries(input);
	const params = entries.filter(([, parameter]) => parameter.optional !== true);
	const options = entries.filter(
		([, parameter]) => parameter.optional === true,
	);
	return { options, params };
};

/**
 * Generate S.Struct for positional params.
 */
export const generateParametersSchema = (
	params: readonly [string, ParamDef][],
): string => {
	if (params.length === 0) {
		return "S.Struct({})";
	}

	const fields = indent(
		params
			.map(
				([name, parameter]) => `${name}: ${parameterDefToSchema(parameter)},`,
			)
			.join("\n"),
		2,
	);

	return `S.Struct({\n${fields}\n\t})`;
};

/**
 * Generate S.Struct for optional params (flags).
 */
export const generateOptionsSchema = (
	options: readonly [string, ParamDef][],
): string => {
	if (options.length === 0) {
		return "S.Struct({})";
	}

	const fields = indent(
		options
			.map(
				([name, parameter]) => `${name}: ${parameterDefToSchema(parameter)},`,
			)
			.join("\n"),
		2,
	);

	return `S.Struct({\n${fields}\n\t})`;
};
