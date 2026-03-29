/**
 * Generate port (DI contract) interfaces from a DomainSchema.
 *
 * Ports are from hexagonal architecture - they define service interfaces.
 * Each port generates:
 * 1. A TypeScript interface with method signatures returning Effect
 * 2. A Context.GenericTag for dependency injection
 */

import type { DomainSchema, PortEntry } from "@morphdsl/domain-schema";

import { getAllPorts, getPortsForContext } from "@morphdsl/domain-schema";

import { typeRefToTypeScript } from "../mappers/type-reference";

/**
 * Collect all error types referenced by a port's methods.
 */
const collectPortErrors = (entry: PortEntry): string[] => {
	const errors = new Set<string>();
	for (const methodDef of Object.values(entry.def.methods)) {
		for (const error of methodDef.errors) {
			errors.add(error);
		}
	}
	return [...errors].sort();
};

/**
 * Generate a single port interface and tag.
 */
const generatePort = (entry: PortEntry, packageScope: string): string => {
	const { name, def } = entry;

	// Generate type parameters
	const typeParams = def.typeParameters ?? [];
	const typeParamString =
		typeParams.length > 0
			? `<${typeParams
					.map((tp) => {
						let param = tp.name;
						if (tp.constraint) {
							param += ` extends ${typeRefToTypeScript(tp.constraint)}`;
						}
						if (tp.default) {
							param += ` = ${typeRefToTypeScript(tp.default)}`;
						}
						return param;
					})
					.join(", ")}>`
			: "";

	// Generate method signatures
	const methods = Object.entries(def.methods)
		.map(([methodName, methodDef]) => {
			// Generate parameters
			const params = Object.entries(methodDef.params)
				.map(([paramName, paramDef]) => {
					const typeString = typeRefToTypeScript(paramDef.type);
					return `${paramName}: ${typeString}`;
				})
				.join(", ");

			// Generate error union (omit if no errors — `never` is the default)
			const errorUnion =
				methodDef.errors.length > 0
					? methodDef.errors.map((error) => `${error}Error`).join(" | ")
					: undefined;

			// Generate return type
			const returnType = typeRefToTypeScript(methodDef.returns);
			const effectType = errorUnion
				? `Effect.Effect<${returnType}, ${errorUnion}>`
				: `Effect.Effect<${returnType}>`;

			return `\t/**
\t * ${methodDef.description}
\t */
\treadonly ${methodName}: (${params}) => ${effectType};`;
		})
		.join("\n\n");

	// Generate interface
	const interfaceCode = `/**
 * ${def.description}
 */
export interface ${name}${typeParamString} {
${methods}
}`;

	// Generate Context tag - for generic ports, fill type params with `unknown`
	const tagTypeArguments =
		typeParams.length > 0
			? `<${typeParams.map(() => "unknown").join(", ")}>`
			: "";
	const tagCode = `/**
 * Context tag for ${name} dependency injection.
 */
export const ${name} = Context.GenericTag<${name}${tagTypeArguments}>("@${packageScope}/${name}");`;

	return `${interfaceCode}\n\n${tagCode}`;
};

export interface GeneratePortsOptions {
	/** If specified, only generate ports for this context */
	readonly contextName?: string | undefined;
	/** Import path for error types */
	readonly errorsImportPath?: string | undefined;
	/** Package scope for tag identifiers (e.g., "morph" for "@morphdsl/Service") */
	readonly packageScope: string;
}

/**
 * Generate port interfaces and tags from a DomainSchema.
 * Returns empty string if no ports are defined.
 */
export const generatePorts = (
	schema: DomainSchema,
	options: GeneratePortsOptions,
): string => {
	const ports = options.contextName
		? getPortsForContext(schema, options.contextName)
		: getAllPorts(schema);

	if (ports.length === 0) {
		return "";
	}

	// Collect all error types referenced by ports
	const allErrors = new Set<string>();
	for (const entry of ports) {
		for (const error of collectPortErrors(entry)) {
			allErrors.add(error);
		}
	}

	const portCode = ports
		.map((entry) => generatePort(entry, options.packageScope))
		.join("\n\n");

	// Generate error imports if any errors are referenced
	const errorsImportPath = options.errorsImportPath ?? "./errors";
	const errorImports =
		allErrors.size > 0
			? `import type { ${[...allErrors].map((error) => `${error}Error`).join(", ")} } from "${errorsImportPath}";\n\n`
			: "";

	return `// Port (DI contract) definitions
// Do not edit - regenerate from schema

import type { Effect } from "effect";

import { Context } from "effect";

${errorImports}${portCode}
`;
};
