/**
 * Generate typed error classes from a DomainSchema.
 *
 * Errors are part of the operation signature and belong in the DSL (free algebra).
 * This enables code sharing: core, client, and API all import error types from DSL.
 *
 * Supports two types of errors:
 * 1. Inline errors (in operations) - simple message-only errors
 * 2. Context-level errors - errors with typed fields
 */

import type { ContextErrorEntry, DomainSchema } from "@morph/domain-schema";

import {
	getAllContextErrors,
	getAllErrors,
	getAllFunctions,
	getAllOperations,
	getContextErrorsForContext,
	getFunctionsForContext,
	getOperationsForContext,
} from "@morph/domain-schema";

import { typeRefToTypeScript } from "../mappers/type-reference";

/**
 * Generate a context-level error class with typed fields.
 */
const generateContextError = (entry: ContextErrorEntry): string => {
	const { name, def } = entry;
	const fields = Object.entries(def.fields)
		.map(([fieldName, fieldDef]) => {
			const optionalMark = fieldDef.optional ? "?" : "";
			const typeStr = typeRefToTypeScript(fieldDef.type);
			return `\treadonly ${fieldName}${optionalMark}: ${typeStr};`;
		})
		.join("\n");

	return `/**
 * ${def.description}
 */
export class ${name}Error extends Data.TaggedError("${name}Error")<{
${fields}
}> {}`;
};

/**
 * Get inline errors for a specific context.
 * Extracts errors from operations and functions within that context.
 */
const getErrorsForContext = (
	schema: DomainSchema,
	contextName: string,
): readonly { name: string; description: string; when: string }[] => {
	const seen = new Set<string>();
	const errors: { name: string; description: string; when: string }[] = [];

	for (const entry of getOperationsForContext(schema, contextName)) {
		for (const error of entry.def.errors) {
			if (!seen.has(error.name)) {
				seen.add(error.name);
				errors.push({
					description: error.description,
					name: error.name,
					when: error.when,
				});
			}
		}
	}

	for (const entry of getFunctionsForContext(schema, contextName)) {
		for (const error of entry.def.errors) {
			if (!seen.has(error.name)) {
				seen.add(error.name);
				errors.push({
					description: error.description,
					name: error.name,
					when: error.when,
				});
			}
		}
	}

	return errors.sort((a, b) => a.name.localeCompare(b.name));
};

export interface GenerateErrorsOptions {
	/** If specified, only generate errors for this context */
	readonly contextName?: string | undefined;
}

/** Convert context name to PascalCase for type names (handles kebab-case) */
const toPascalCase = (name: string): string =>
	name
		.split("-")
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join("");

/**
 * Generate error types file content from a DomainSchema.
 * Returns empty string if no errors are defined.
 *
 * Handles both inline errors (from operations) and context-level errors (with fields).
 * When generating for a specific context, uses context-prefixed union name to avoid
 * conflicts when re-exporting from dependent contexts.
 */
export const generateErrors = (
	schema: DomainSchema,
	options: GenerateErrorsOptions = {},
): string => {
	const inlineErrors = options.contextName
		? getErrorsForContext(schema, options.contextName)
		: getAllErrors(schema);
	const contextErrors = options.contextName
		? getContextErrorsForContext(schema, options.contextName)
		: getAllContextErrors(schema);

	if (inlineErrors.length === 0 && contextErrors.length === 0) {
		return "";
	}

	const errorClasses: string[] = [];
	const errorNames: string[] = [];

	// Generate context-level errors (with typed fields)
	for (const entry of contextErrors) {
		errorClasses.push(generateContextError(entry));
		errorNames.push(`${entry.name}Error`);
	}

	// Generate inline errors (simple message-only)
	for (const error of inlineErrors) {
		// Skip if already generated as context-level error
		if (errorNames.includes(`${error.name}Error`)) {
			continue;
		}
		errorClasses.push(`/**
 * ${error.description}
 * Occurs when: ${error.when}
 */
export class ${error.name}Error extends Data.TaggedError("${error.name}Error")<{
	readonly message: string;
}> {}`);
		errorNames.push(`${error.name}Error`);
	}

	// Use context-specific union name when generating for a single context
	// to avoid conflicts when dependent contexts re-export
	const unionName = options.contextName
		? `${toPascalCase(options.contextName)}Error`
		: "DomainError";
	const allErrorsUnion = `export type ${unionName} = ${errorNames.sort().join(" | ")};`;

	return `// Effect TaggedError definitions
// Do not edit - regenerate from schema

import { Data } from "effect";

${errorClasses.join("\n\n")}

/**
 * Union of all ${options.contextName ? `${options.contextName} context` : "domain"} errors.
 */
${allErrorsUnion}
`;
};
