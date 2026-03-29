/**
 * Context-specific DSL generation for per-context packages.
 */
import type { ContextDef, ParamDef, TypeRef } from "@morphdsl/domain-schema";

export interface DependencyImport {
	readonly contextName: string;
	readonly packageName: string;
}

export interface GenerateContextDslOptions {
	/** Imports from dependency context packages */
	readonly dependencyImports: readonly DependencyImport[];
	/** Import path for local types (e.g., "./schemas") */
	readonly typesImportPath: string;
}

interface GeneratableDef {
	readonly input: Record<string, ParamDef>;
	readonly output: TypeRef;
}

/**
 * Get operations (commands and queries) from a context.
 * Operations need handlers and get wrapped with defineOp.
 * Functions are pure and don't need defineOp wrappers.
 */
const getContextOperations = (
	context: ContextDef,
): Record<string, GeneratableDef> => ({
	...context.commands,
	...context.queries,
});

/**
 * Check if a context has operations (commands or queries).
 */
const hasOperations = (context: ContextDef): boolean =>
	Object.keys(context.commands ?? {}).length > 0 ||
	Object.keys(context.queries ?? {}).length > 0;

/**
 * Recursively collect type names from a TypeRef.
 */
const collectTypesFromRef = (reference: TypeRef, types: Set<string>): void => {
	switch (reference.kind) {
		case "array": {
			collectTypesFromRef(reference.element, types);
			break;
		}
		case "entity": {
			types.add(reference.name);
			break;
		}
		case "entityId": {
			types.add(`${reference.entity}Id`);
			break;
		}
		case "generic": {
			// Collect the generic type name and recurse into args
			types.add(reference.name);
			for (const argument of reference.args) {
				collectTypesFromRef(argument, types);
			}
			break;
		}
		case "optional": {
			collectTypesFromRef(reference.inner, types);
			break;
		}
		case "primitive":
		case "typeParam":
		case "union": {
			// Primitives, type parameters, and unions don't add imports
			break;
		}
		case "type": {
			types.add(reference.name);
			break;
		}
		case "valueObject": {
			types.add(reference.name);
			break;
		}
	}
};

/**
 * Collect all type names that need to be imported for a context.
 */
const collectTypeImports = (context: ContextDef): string[] => {
	const types = new Set<string>();

	const operations = getContextOperations(context);
	for (const opDef of Object.values(operations)) {
		for (const parameter of Object.values(opDef.input)) {
			collectTypesFromRef(parameter.type, types);
		}
		collectTypesFromRef(opDef.output, types);
	}

	return [...types].sort();
};

/**
 * Convert a TypeRef to TypeScript type syntax.
 */
const typeRefToTypeScript = (reference: TypeRef): string => {
	switch (reference.kind) {
		case "array": {
			return `readonly ${typeRefToTypeScript(reference.element)}[]`;
		}
		case "entity": {
			return reference.name;
		}
		case "entityId": {
			return `${reference.entity}Id`;
		}
		case "optional": {
			return `${typeRefToTypeScript(reference.inner)} | undefined`;
		}
		case "primitive": {
			const primitiveMap: Record<string, string> = {
				boolean: "boolean",
				date: "string",
				datetime: "Date",
				float: "number",
				integer: "bigint",
				string: "string",
				unknown: "unknown",
				void: "void",
			};
			return primitiveMap[reference.name] ?? reference.name;
		}
		case "type": {
			return reference.name;
		}
		case "union": {
			return reference.values.map((v) => `"${v}"`).join(" | ");
		}
		case "valueObject": {
			return reference.name;
		}
		case "generic": {
			const args = reference.args.map(typeRefToTypeScript).join(", ");
			return `${reference.name}<${args}>`;
		}
		case "typeParam": {
			return reference.name;
		}
		case "function": {
			const params = reference.params
				.map((p) => `${p.name}: ${typeRefToTypeScript(p.type)}`)
				.join(", ");
			return `(${params}) => ${typeRefToTypeScript(reference.returns)}`;
		}
		default: {
			const _exhaustive: never = reference;
			return _exhaustive;
		}
	}
};

/**
 * Generate TypeScript type for operation parameters.
 */
const generateParametersType = (input: Record<string, ParamDef>): string => {
	const entries = Object.entries(input);
	if (entries.length === 0) return "Record<string, never>";

	const props = entries
		.map(([name, parameter]) => {
			const type = typeRefToTypeScript(parameter.type);
			const optional = parameter.optional ? "?" : "";
			return `${name}${optional}: ${type}`;
		})
		.join("; ");

	return `{ ${props} }`;
};

/**
 * Generate a DSL operation export.
 */
const generateOperation = (name: string, def: GeneratableDef): string => {
	const paramsType = generateParametersType(def.input);
	const resultType = typeRefToTypeScript(def.output);

	// Single-line format for short lines, multi-line for longer ones
	const singleLine = `export const ${name} = defineOp<${paramsType}, ${resultType}>("${name}");`;
	if (singleLine.length <= 80) {
		return singleLine;
	}

	return `export const ${name} = defineOp<${paramsType}, ${resultType}>(
	"${name}",
);`;
};

/**
 * Generate DSL code for a specific context.
 * Only generates defineOp wrappers for operations (commands/queries).
 * Functions are pure and come from impls, not the DSL.
 */
export const generateContextDsl = (
	contextName: string,
	context: ContextDef,
	options: GenerateContextDslOptions,
): string => {
	const lines: string[] = [
		`// Generated DSL for context: ${contextName}`,
		"// Do not edit manually",
		"",
	];

	// Only import defineOp if context has operations (commands/queries)
	if (hasOperations(context)) {
		lines.push('import { defineOp } from "@morphdsl/operation";', "");
	}

	const typeImports = collectTypeImports(context);
	if (typeImports.length > 0) {
		lines.push(
			`import type { ${typeImports.join(", ")} } from "${options.typesImportPath}";`,
			"",
		);
	}

	// Generate defineOp wrappers only for operations (commands/queries)
	const operations = getContextOperations(context);
	for (const [opName, opDef] of Object.entries(operations)) {
		const opCode = generateOperation(opName, opDef);
		lines.push(opCode, "");
	}

	return lines.join("\n");
};
