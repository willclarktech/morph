/**
 * Handler implementation template generation for functions.
 *
 * Templates are generated in core packages but NOT imported.
 * They serve as starting points for hand-written implementations
 * in impls packages.
 */
import type {
	DomainSchema,
	FunctionDef,
	GeneratedFile,
} from "@morphdsl/domain-schema";

import { getFunctionsFlat } from "@morphdsl/domain-schema";
import {
	indent,
	sortImports,
	toKebabCase,
	toPascalCase,
} from "@morphdsl/utils";

import {
	describeFunctionOutput,
	extractFunctionOutputTypes,
} from "./handler-output-utilities";

/**
 * Generate a template handler implementation file for a function.
 * This template is NOT imported by the core package.
 * It's copied to impls packages where it becomes hand-maintained.
 */
export const generateFunctionHandlerImplTemplate = (
	name: string,
	function_: FunctionDef,
	typesImportPath = "../../schemas",
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	// Error imports - from DSL package
	const hasErrors = function_.errors.length > 0;
	const firstError = function_.errors[0];
	const firstErrorName = firstError ? `${firstError.name}Error` : undefined;

	// For stubs without errors, we need the output type
	const outputTypes = extractFunctionOutputTypes(function_);

	// Build imports from DSL package
	const schemaImports =
		!hasErrors && outputTypes.length > 0
			? `import type { ${outputTypes.join(", ")} } from "${typesImportPath}";\n`
			: "";
	const errorImport =
		hasErrors && firstErrorName
			? `import { ${firstErrorName} } from "${typesImportPath}";\n`
			: "";

	// Handler import
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Generate return type - use unknown for type parameters in stub
	const typeParams = function_.typeParameters ?? [];
	const outputType =
		typeParams.length > 0
			? describeFunctionOutput(function_).replaceAll(
					/<[^>]+>/g,
					`<${typeParams.map(() => "unknown").join(", ")}>`,
				)
			: describeFunctionOutput(function_);

	// Generate fail expression for stub
	const failExpr =
		hasErrors && firstErrorName
			? `Effect.fail(new ${firstErrorName}({ message: "Not implemented" }))`
			: `Effect.succeed({} as ${outputType})`;

	// Build imports
	const typeImportLines = schemaImports ? [schemaImports.trim()] : [];
	const relativeImportLines = [
		...(errorImport ? [errorImport.trim()] : []),
		handlerImport.trim(),
	];

	const importBlock = sortImports(
		[
			...typeImportLines,
			'import { Effect, Layer } from "effect";',
			...relativeImportLines,
		].join("\n"),
	);

	const header = [
		"// Template for implementing the function handler.",
		"// This file is NOT imported by the core package.",
		"// Copy to your impls package and implement the logic.",
		"",
		importBlock,
		"",
	].join("\n");

	// Build JSDoc
	const jsdocLines = [
		`/**`,
		` * Implementation of ${name} function.`,
		` * ${function_.description}`,
		` */`,
	];

	const handleBody = `// TODO: Implement ${name}
// Params: ${Object.keys(function_.input).join(", ")}
return yield* ${failExpr};`;

	const body = [
		...jsdocLines,
		`export const ${handlerName}Live = Layer.succeed(`,
		indent(`${handlerName},`, 1),
		indent(`{`, 1),
		indent(`handle: (_params, _options) =>`, 2),
		indent(`Effect.gen(function* () {`, 3),
		indent(handleBody, 4),
		indent(`}),`, 3),
		indent(`},`, 1),
		`);`,
		"",
	].join("\n");

	return header + body;
};

/**
 * Generate all handler implementation template files for functions.
 * These templates are NOT imported - they serve as starting points
 * for hand-written implementations in impls packages.
 */
export const generateFunctionHandlerImplTemplates = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
): readonly GeneratedFile[] => {
	const functions = getFunctionsFlat(schema);

	// Templates are always regenerated (not scaffolds)
	return Object.entries(functions).map(([name, function_]) => ({
		content: generateFunctionHandlerImplTemplate(
			name,
			function_,
			typesImportPath,
		),
		filename: `operations/${toKebabCase(name)}/impl.template.ts`,
	}));
};
