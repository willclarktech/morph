/**
 * Handler interface generation for operations (commands and queries).
 */
import type { OperationDef } from "@morph/domain-schema";

import { indent, sortImports, toPascalCase } from "@morph/utils";

import {
	describeOutput,
	extractInputSchemas,
	extractOutputTypes,
} from "./operation";
import { typeRefToTsType } from "./type-utilities";

/**
 * Generate handler interface and Context tag for a single operation.
 */
export const generateHandler = (
	name: string,
	operation: OperationDef,
	typesImportPath = "../../schemas",
	projectName = "app",
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	// Extract schema imports (for params) and type imports (for output)
	const inputSchemas = extractInputSchemas(operation);
	const outputTypes = extractOutputTypes(operation);

	// Error type name
	const hasErrors = operation.errors.length > 0;
	const errorNames = operation.errors.map((error) => `${error.name}Error`);

	// Combine schema, type, and error imports - all from DSL package
	const allTypeImports = [
		...new Set([...errorNames, ...inputSchemas, ...outputTypes]),
	];
	const combinedImports =
		allTypeImports.length > 0
			? `import type { ${allTypeImports.join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Generate params type
	const paramsType = generateParametersType(operation);

	// Generate options type
	const optionsType = generateOptionsType(operation);

	// Generate return type
	const outputType = describeOutput(operation);
	// Error union type - all errors this operation can return
	const errorType = hasErrors ? errorNames.join(" | ") : "never";

	// Build imports in correct order for perfectionist/sort-imports:
	// 1. Type imports first (sorted by source: @scoped packages, then external, then relative)
	// 2. Value imports
	const typeImportLines: string[] = [];
	if (combinedImports) typeImportLines.push(combinedImports.trim());
	typeImportLines.push('import type { Effect } from "effect";');

	const importBlock = sortImports(
		[...typeImportLines, 'import { Context } from "effect";'].join("\n"),
	);

	const header = [
		"// Generated handler interface - do not edit",
		"",
		importBlock,
	].join("\n");

	// Generate parameter JSDoc tags
	const paramDocs = generateParamDocs(operation);
	const paramDocsBlock =
		paramDocs.length > 0 ? paramDocs.join("\n") + "\n" : "";

	const body = [
		`/**`,
		` * Handler interface for ${name} operation.`,
		operation.description ? ` * ${operation.description}` : "",
		` */`,
		`export interface ${handlerName} {`,
		indent(`/**`, 1),
		paramDocsBlock + indent(`*/`, 1),
		indent(`readonly handle: (`, 1),
		indent(`params: ${paramsType},`, 2),
		indent(`options: ${optionsType},`, 2),
		indent(`) => Effect.Effect<${outputType}, ${errorType}>;`, 1),
		`}`,
		"",
		`/**`,
		` * Context tag for ${handlerName} dependency injection.`,
		` */`,
		`export const ${handlerName} = Context.GenericTag<${handlerName}>(`,
		indent(`"@${projectName}/${handlerName}",`, 1),
		`);`,
		"",
	]
		.filter((line) => line !== "")
		.join("\n");

	return header + body;
};

/**
 * Generate JSDoc @param tags for operation parameters.
 */
const generateParamDocs = (operation: OperationDef): readonly string[] => {
	const params = Object.entries(operation.input);
	if (params.length === 0) return [];

	return params.map(([name, parameter]) => {
		const prefix = parameter.optional ? "options" : "params";
		return `\t * @param ${prefix}.${name} - ${parameter.description}`;
	});
};

/**
 * Generate params type for handler interface.
 */
const generateParametersType = (operation: OperationDef): string => {
	const requiredParameters = Object.entries(operation.input).filter(
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
 * Generate options type for handler interface.
 */
const generateOptionsType = (operation: OperationDef): string => {
	const optionalParameters = Object.entries(operation.input).filter(
		([, parameter]) => parameter.optional === true,
	);

	if (optionalParameters.length === 0) {
		return "Record<string, never>";
	}

	// Add | undefined to match Schema's S.optional() output type
	const fields = optionalParameters
		.map(
			([name, parameter]) =>
				`readonly ${name}?: ${typeRefToTsType(parameter.type)} | undefined`,
		)
		.join("; ");

	return `{ ${fields} }`;
};
