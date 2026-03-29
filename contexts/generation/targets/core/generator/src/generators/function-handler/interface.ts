/**
 * Handler interface generation for functions.
 * Functions are simpler than commands/queries - no events, no invariants.
 */
import type { FunctionDef } from "@morphdsl/domain-schema";

import { indent, toPascalCase } from "@morphdsl/utils";

import {
	extractFunctionInputSchemas,
	extractFunctionOutputTypes,
} from "./extraction";
import {
	describeFunctionOutput,
	generateFunctionOptionsType,
	generateFunctionParametersType,
} from "./types";

/**
 * Generate handler interface for a function.
 */
export const generateFunctionHandler = (
	name: string,
	function_: FunctionDef,
	typesImportPath = "../../schemas",
	projectName = "app",
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	// Extract schema imports (for params) and type imports (for output)
	const inputSchemas = extractFunctionInputSchemas(function_);
	const outputTypes = extractFunctionOutputTypes(function_);

	// Error type name
	const hasErrors = function_.errors.length > 0;
	const errorNames = function_.errors.map((error) => `${error.name}Error`);

	// Combine schema, type, and error imports - all from DSL package
	const allTypeImports = [
		...new Set([...errorNames, ...inputSchemas, ...outputTypes]),
	];
	const combinedImports =
		allTypeImports.length > 0
			? `import type { ${allTypeImports.join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Generate params type
	const paramsType = generateFunctionParametersType(function_);

	// Generate options type
	const optionsType = generateFunctionOptionsType(function_);

	// Generate return type
	const outputType = describeFunctionOutput(function_);
	// Error union type - all errors this function can return
	const errorType = hasErrors ? errorNames.join(" | ") : undefined;

	// Handle type parameters for generic functions
	const typeParams = function_.typeParameters ?? [];
	const typeParamList =
		typeParams.length > 0
			? `<${typeParams.map((tp) => tp.name).join(", ")}>`
			: "";

	// Build imports in correct order for perfectionist/sort-imports
	const typeImportLines: string[] = [];
	if (combinedImports) typeImportLines.push(combinedImports.trim());
	typeImportLines.push('import type { Effect } from "effect";');

	const header = [
		"// Generated handler interface - do not edit",
		"",
		typeImportLines.join("\n"),
		"",
		'import { Context } from "effect";',
	].join("\n");

	// Generate parameter JSDoc tags
	const paramDocs = generateFunctionParamDocs(function_);
	const paramDocsBlock =
		paramDocs.length > 0 ? paramDocs.join("\n") + "\n" : "";

	// For Context tags, use `unknown` for type parameters since tags must be concrete at runtime
	const typeParamListUnknown =
		typeParams.length > 0
			? `<${typeParams.map(() => "unknown").join(", ")}>`
			: "";

	const body = [
		`/**`,
		` * Handler interface for ${name} function.`,
		function_.description ? ` * ${function_.description}` : "",
		` */`,
		`export interface ${handlerName}${typeParamList} {`,
		indent(`/**`, 1),
		paramDocsBlock + indent(`*/`, 1),
		indent(`readonly handle: (`, 1),
		indent(`params: ${paramsType},`, 2),
		indent(`options: ${optionsType},`, 2),
		indent(
			`) => Effect.Effect<${outputType}${errorType ? `, ${errorType}` : ""}>;`,
			1,
		),
		`}`,
		"",
		`/**`,
		` * Context tag for ${handlerName} dependency injection.`,
		` */`,
		`export const ${handlerName} = Context.GenericTag<${handlerName}${typeParamListUnknown}>(`,
		indent(`"@${projectName}/${handlerName}",`, 1),
		`);`,
		"",
	]
		.filter((line) => line !== "")
		.join("\n");

	return header + body;
};

/**
 * Generate JSDoc @param tags for function parameters.
 */
export const generateFunctionParamDocs = (
	function_: FunctionDef,
): readonly string[] => {
	const params = Object.entries(function_.input);
	if (params.length === 0) return [];

	return params.map(([name, parameter]) => {
		const prefix = parameter.optional ? "options" : "params";
		return `\t * @param ${prefix}.${name} - ${parameter.description}`;
	});
};
