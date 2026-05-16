import type { FunctionDef, ParamDef, TypeRef } from "@morphdsl/domain-schema";

import { indent, sortImports, toPascalCase } from "@morphdsl/utils";

import { parameterDefToSchema } from "../mappers";

/**
 * Generate a function operation file (index.ts) from a FunctionDef.
 *
 * Emits three pieces:
 *  1. The handler interface re-export.
 *  2. A live Layer that binds the impl into the handler tag — for functions
 *     without declared errors, the impl is a plain pure function and the
 *     Layer wraps each call in `Effect.sync`; for functions with declared
 *     errors, the impl returns an `Effect`, which the Layer relays directly.
 *  3. The `defineOperation` descriptor (entered into the `ops` namespace).
 *
 * The impl file (`./impl`) is hand-written by the user. The top-level core
 * barrel re-exports the plain function for client-side use; see
 * `generateMainBarrel` in barrel.ts.
 */
export const generateFunctionOperation = (
	name: string,
	function_: FunctionDef,
	typesImportPath = "../../schemas",
): string => {
	const { options: optionalParameters, params } = splitFunctionParameters(
		function_.input,
	);

	const paramsSchema = generateFunctionParametersSchema(params);
	const optionsSchema = generateFunctionOptionsSchema(optionalParameters);

	// Extract schema imports (for params)
	const inputSchemas = extractFunctionInputSchemas(function_);

	// Schema imports (value imports for runtime use in params)
	const schemaImports =
		inputSchemas.length > 0
			? `import { ${inputSchemas.map((s) => `${s}Schema`).join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Handler import (local module)
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Impl import: alias to avoid clash with the `defineOperation` export below.
	const implAlias = `${name}Impl`;
	const implImport = `import { ${name} as ${implAlias} } from "./impl";\n`;

	// Re-export handler
	const reExports = ['export * from "./handler";', ""].join("\n");

	// Build imports
	const relativeImports = [
		...(schemaImports ? [schemaImports.trim()] : []),
		implImport.trim(),
		handlerImport.trim(),
	].filter((line) => line !== "");

	const imports = sortImports(
		[
			'import { defineOperation } from "@morphdsl/operation";',
			'import { Effect, Layer } from "effect";',
			'import * as S from "effect/Schema";',
			"",
			...relativeImports,
		].join("\n"),
	);

	const header = [
		"// Generated function operation - delegates to injected handler",
		"// Do not edit - regenerate from schema",
		"",
		imports,
		"",
		reExports,
	].join("\n");

	// JSDoc for the function
	const jsdoc = function_.description
		? [`/**`, ` * ${function_.description}`, ` */`].join("\n") + "\n"
		: "";

	// Layer wraps the impl. For no-error impls, the impl returns the output
	// value directly; we wrap in Effect.sync. For impls with declared errors,
	// the impl returns an Effect; we relay it.
	const hasErrors = function_.errors.length > 0;
	const handleExpr = hasErrors
		? `${implAlias}(params, options)`
		: `Effect.sync(() => ${implAlias}(params, options))`;

	const layerBlock = [
		"/**",
		` * Live Layer binding the ${name} impl into ${handlerName}.`,
		" */",
		`export const ${handlerName}Live = Layer.succeed(${handlerName}, {`,
		`\thandle: (params, options) =>`,
		`\t\t${handleExpr},`,
		`});`,
		"",
	].join("\n");

	const executeBody = `Effect.flatMap(${handlerName}, (handler) =>
${indent(`handler.handle(params, options),`, 3)}
${indent(`)`, 2)}`;

	const opBlock = [
		jsdoc + `export const ${name} = defineOperation({`,
		`\tname: "${name}",`,
		`\tdescription: "${function_.description}",`,
		`\tparams: ${paramsSchema},`,
		`\toptions: ${optionsSchema},`,
		`\texecute: (params, options) =>`,
		`\t\t${executeBody},`,
		`});`,
		"",
	].join("\n");

	return header + layerBlock + "\n" + opBlock;
};

/**
 * Split function params into positional (required) and options (optional).
 */
const splitFunctionParameters = (
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
 * Generate S.Struct for function positional params.
 */
const generateFunctionParametersSchema = (
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
 * Generate S.Struct for function optional params.
 */
const generateFunctionOptionsSchema = (
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

/**
 * Extract schema names from function input that need imports.
 */
const extractFunctionInputSchemas = (
	function_: FunctionDef,
): readonly string[] => {
	const schemas = Object.values(function_.input).flatMap((parameter) =>
		collectFunctionSchemasFromTypeRef(parameter.type),
	);
	return [...new Set(schemas)].toSorted();
};

/**
 * Collect schema names from TypeRef for functions.
 */
const collectFunctionSchemasFromTypeRef = (
	reference: TypeRef,
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
