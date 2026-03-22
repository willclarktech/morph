import type { DomainSchema, FunctionDef, TypeRef } from "@morph/domain-schema";

import {
	getAllFunctions,
	getFunctionsForContext,
	getTypesForContext,
} from "@morph/domain-schema";

import { typeRefToSchema } from "../mappers/schema-reference";
import { typeRefToTypeScript } from "../mappers/type-reference";

export interface GenerateFunctionSchemasOptions {
	/** If specified, only generate functions for this context */
	readonly contextName?: string | undefined;
	/**
	 * Package to import external output types from.
	 * External types are those referenced in function outputs but not defined in the schema.
	 * For example, `@morph/property` for the property context.
	 */
	readonly externalTypesPackage?: string | undefined;
}

/**
 * Extract type names from a TypeRef that would need to be imported.
 * Returns the top-level type name for type/entity/generic references.
 */
const getExternalTypeName = (ref: TypeRef): string | undefined => {
	switch (ref.kind) {
		case "type":
		case "entity":
			return ref.name;
		case "generic":
			return ref.name;
		default:
			return undefined;
	}
};

/**
 * Generate schemas and types for pure functions.
 * Functions are stateless transformations without side effects.
 */
export const generateFunctionSchemas = (
	schema: DomainSchema,
	options: GenerateFunctionSchemasOptions = {},
): string => {
	const allFunctions = options.contextName
		? getFunctionsForContext(schema, options.contextName)
		: getAllFunctions(schema);
	const functions = allFunctions.map(
		(entry) => [entry.name, entry.def] as const,
	);

	if (functions.length === 0) {
		return "";
	}

	// Get types defined in the schema for this context
	const definedTypes = new Set<string>();
	if (options.contextName) {
		const schemaTypes = getTypesForContext(schema, options.contextName);
		for (const { name } of schemaTypes) {
			definedTypes.add(name);
		}
	}

	// Collect all unique error type names
	const errorTypes = new Set<string>();
	for (const [, functionDef] of functions) {
		for (const error of functionDef.errors) {
			errorTypes.add(`${error.name}Error`);
		}
	}

	// Collect external output types (referenced but not defined in schema)
	const externalTypes = new Set<string>();
	if (options.externalTypesPackage) {
		for (const [, functionDef] of functions) {
			const typeName = getExternalTypeName(functionDef.output);
			if (typeName && !definedTypes.has(typeName)) {
				externalTypes.add(typeName);
			}
		}
	}

	const functionSchemas = functions.map(([name, functionDef]) =>
		generateFunctionSchema(name, functionDef),
	);

	// Add import for error types if any
	const errorImport =
		errorTypes.size > 0
			? `import { ${[...errorTypes].sort().join(", ")} } from "./errors";\n\n`
			: "";

	// Add import for external types if any
	const externalImport =
		externalTypes.size > 0 && options.externalTypesPackage
			? `import type { ${[...externalTypes].sort().join(", ")} } from "${options.externalTypesPackage}";\n\n`
			: "";

	const sections = [
		"// Function Schemas (pure transformations)",
		"",
		externalImport,
		errorImport,
		...functionSchemas,
	];

	return sections.join("\n");
};

const capitalize = (s: string): string =>
	s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Generate input schema, output type, and error types for a function.
 */
const generateFunctionSchema = (
	name: string,
	functionDef: FunctionDef,
): string => {
	const capitalizedName = capitalize(name);

	// Generate input schema
	const inputFields = Object.entries(functionDef.input).map(
		([paramName, paramDef]) => {
			const baseSchema = typeRefToSchema(paramDef.type);
			const optionalWrapper = paramDef.optional ? "S.optional(" : "";
			const optionalClose = paramDef.optional ? ")" : "";
			return `\t${paramName}: ${optionalWrapper}${baseSchema}${optionalClose},`;
		},
	);

	// Generate output type with type parameters if the function is generic
	const outputType = typeRefToTypeScript(functionDef.output);
	const typeParams = functionDef.typeParameters ?? [];
	const typeParamList =
		typeParams.length > 0
			? `<${typeParams.map((tp) => tp.name).join(", ")}>`
			: "";

	// Generate error union type (error classes have "Error" suffix)
	const errorTypes =
		functionDef.errors.length > 0
			? functionDef.errors
					.map((errorDef) => `${errorDef.name}Error`)
					.join(" | ")
			: "never";

	// Only include error type alias if there are errors (they're imported from ./errors)
	const errorLine =
		functionDef.errors.length > 0
			? `export type ${capitalizedName}Error = ${errorTypes};`
			: "";

	const lines = [
		`// ${functionDef.description}`,
		`export const ${capitalizedName}InputSchema = S.Struct({`,
		...inputFields,
		"});",
		"",
		`export type ${capitalizedName}Input = S.Schema.Type<typeof ${capitalizedName}InputSchema>;`,
		`export type ${capitalizedName}Output${typeParamList} = ${outputType};`,
	];

	if (errorLine) {
		lines.push(errorLine);
	}
	lines.push("");

	return lines.join("\n");
};
