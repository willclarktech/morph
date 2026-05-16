/**
 * Implementation template generation for functions.
 *
 * The template is the file the user copies into their fixture's impls
 * package; the generated core package imports it as `./impl` for both the
 * Layer binding and (for no-error functions) for the top-level re-export.
 */
import type {
	DomainSchema,
	FunctionDef,
	GeneratedFile,
	TypeRef,
} from "@morphdsl/domain-schema";

import { getFunctionsFlat } from "@morphdsl/domain-schema";
import { indent, sortImports, toKebabCase } from "@morphdsl/utils";

import {
	describeFunctionOutput,
	extractFunctionOutputTypes,
} from "./handler-output-utilities";

/**
 * Generate a template implementation file for a function.
 *
 * The template is the starting point the user copies into their impl. The
 * generated core package imports this file directly (`./impl`), so the
 * expected shape is fixed:
 *
 *   - No declared errors: a plain pure function returning the output type
 *     synchronously. Core wraps each call in `Effect.sync` for the Layer
 *     binding. The function is also re-exported at core's top level for
 *     client-side bundling without the Effect runtime.
 *
 *   - With declared errors: a function returning `Effect.Effect<Output, E>`
 *     so failure can be expressed structurally. Core relays the Effect
 *     directly. Not re-exported at core's top level.
 */
export const generateFunctionHandlerImplTemplate = (
	name: string,
	function_: FunctionDef,
	typesImportPath = "../../schemas",
): string => {
	const hasErrors = function_.errors.length > 0;
	const errorNames = function_.errors.map((e) => `${e.name}Error`);

	// For stubs without errors, we need the output type
	const outputTypes = extractFunctionOutputTypes(function_);

	const typeOnlyImports = [...new Set([...outputTypes])];
	const valueImports = hasErrors ? errorNames : [];

	const typeImportLine =
		typeOnlyImports.length > 0
			? `import type { ${typeOnlyImports.join(", ")} } from "${typesImportPath}";`
			: "";
	const valueImportLine =
		valueImports.length > 0
			? `import { ${valueImports.join(", ")} } from "${typesImportPath}";`
			: "";

	// Generate return type - use unknown for type parameters in stub
	const typeParams = function_.typeParameters ?? [];
	const outputType =
		typeParams.length > 0
			? describeFunctionOutput(function_).replaceAll(
					/<[^>]+>/g,
					`<${typeParams.map(() => "unknown").join(", ")}>`,
				)
			: describeFunctionOutput(function_);

	const paramNames = Object.keys(function_.input);
	const paramComment =
		paramNames.length > 0 ? `// Params: ${paramNames.join(", ")}` : "";
	const firstError = errorNames[0];
	const todoBody =
		hasErrors && firstError
			? `${paramComment ? paramComment + "\n\t\t" : ""}return yield* Effect.fail(new ${firstError}({ message: "Not implemented" }));`
			: `${paramComment ? paramComment + "\n\t" : ""}// TODO: Implement ${name}\n\treturn {} as ${outputType};`;

	const importLines = sortImports(
		[
			...(typeImportLine ? [typeImportLine] : []),
			...(hasErrors ? ['import { Effect } from "effect";'] : []),
			...(valueImportLine ? [valueImportLine] : []),
		].join("\n"),
	);

	const header = [
		"// Template for implementing the function.",
		"// Copy to your impls package and implement the logic.",
		"",
		importLines,
		"",
	]
		.filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
		.join("\n");

	const jsdoc = [
		`/**`,
		` * Implementation of ${name} function.`,
		function_.description ? ` * ${function_.description}` : "",
		` */`,
	]
		.filter((line) => line !== "")
		.join("\n");

	const optionsType = "Record<string, never>";
	const paramsType = generateFunctionParametersType(function_);

	const body = hasErrors
		? [
				jsdoc,
				`export const ${name} = (`,
				indent(`params: ${paramsType},`, 1),
				indent(`_options: ${optionsType},`, 1),
				`): Effect.Effect<${outputType}, ${errorNames.join(" | ")}> =>`,
				indent(`Effect.gen(function* () {`, 1),
				indent(todoBody, 2),
				indent(`});`, 1),
				"",
			].join("\n")
		: [
				jsdoc,
				`export const ${name} = (`,
				indent(`params: ${paramsType},`, 1),
				indent(`_options: ${optionsType},`, 1),
				`): ${outputType} => {`,
				indent(todoBody, 1),
				`};`,
				"",
			].join("\n");

	return header + body;
};

/**
 * Build a TS type literal for the function's params (the non-optional inputs).
 */
const generateFunctionParametersType = (function_: FunctionDef): string => {
	const params = Object.entries(function_.input).filter(
		([, p]) => p.optional !== true,
	);
	if (params.length === 0) return "Record<string, never>";
	const fields = params
		.map(([n, p]) => `readonly ${n}: ${typeRefToTs(p.type)}`)
		.join("; ");
	return `{ ${fields} }`;
};

const typeRefToTs = (t: TypeRef): string => {
	switch (t.kind) {
		case "array":
			return `readonly ${typeRefToTs(t.element)}[]`;
		case "entity":
		case "type":
		case "valueObject":
			return t.name;
		case "entityId":
			return `${t.entity}Id`;
		case "optional":
			return `${typeRefToTs(t.inner)} | undefined`;
		case "primitive": {
			const map: Record<string, string> = {
				boolean: "boolean",
				date: "Date",
				datetime: "Date",
				float: "number",
				integer: "bigint",
				string: "string",
				unknown: "unknown",
				void: "void",
			};
			return map[t.name] ?? "unknown";
		}
		case "generic":
			return t.args.length > 0
				? `${t.name}<${t.args.map(typeRefToTs).join(", ")}>`
				: t.name;
		case "typeParam":
			return t.name;
		case "function":
			return "Function";
		case "union":
			return t.values.map((v) => JSON.stringify(v)).join(" | ");
	}
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
