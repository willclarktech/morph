/**
 * Parameter extraction utilities for CLI test generation.
 */

interface ParamDef {
	optional?: boolean;
	sensitive?: boolean;
}

interface OperationLike {
	def: { input: Record<string, ParamDef> };
}

/**
 * Get non-optional, non-sensitive parameter names from an operation.
 */
export const getParamNames = (op: OperationLike): string[] =>
	Object.entries(op.def.input)
		.filter(([, p]) => !p.optional && !p.sensitive)
		.map(([name]) => name);

/**
 * Get optional parameter names from an operation.
 */
export const getOptionNames = (op: OperationLike): string[] =>
	Object.entries(op.def.input)
		.filter(([, p]) => p.optional)
		.map(([name]) => name);

/**
 * Get sensitive parameter names from an operation.
 */
export const getSensitiveNames = (op: OperationLike): string[] =>
	Object.entries(op.def.input)
		.filter(([, p]) => p.sensitive)
		.map(([name]) => name);
