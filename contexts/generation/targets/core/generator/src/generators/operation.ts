import type { InvariantDef, OperationDef } from "@morph/domain-schema";

import { indent, sortImports, toPascalCase } from "@morph/utils";

import { conditionReferencesCurrentUser } from "./invariants";
import { extractInputSchemas } from "./output-types";
import {
	generateOptionsSchema,
	generateParametersSchema,
	splitParameters,
} from "./parameters";
import {
	generateExecuteWithEvents,
	generateExecuteWithInvariants,
} from "./wrappers";

/**
 * Options for generating an operation with invariant wrapping.
 */
export interface GenerateOperationOptions {
	/** Post-invariants to execute after handler */
	readonly postInvariants?: readonly InvariantDef[];
	/** Pre-invariants to execute before handler */
	readonly preInvariants?: readonly InvariantDef[];
	/** Types import path */
	readonly typesImportPath?: string;
}

/**
 * Generate a single operation file from an OperationDef.
 * The operation delegates to an injected Handler for implementation.
 * If the operation emits an event, auto-emit is added after handler success.
 * If pre/post invariants are specified, they are executed around the handler.
 */
export const generateOperation = (
	name: string,
	operation: OperationDef,
	typesImportPathOrOptions: GenerateOperationOptions | string = "../../schemas",
): string => {
	// Handle both old string-only signature and new options object
	const genOptions: GenerateOperationOptions =
		typeof typesImportPathOrOptions === "string"
			? { typesImportPath: typesImportPathOrOptions }
			: typesImportPathOrOptions;
	const typesImportPath = genOptions.typesImportPath ?? "../../schemas";
	const preInvariants = genOptions.preInvariants ?? [];
	const postInvariants = genOptions.postInvariants ?? [];
	const hasInvariants = preInvariants.length > 0 || postInvariants.length > 0;

	const { options: optionalParameters, params } = splitParameters(
		operation.input,
	);
	const eventNames =
		"emits" in operation ? operation.emits.map((event) => event.name) : [];
	const hasEvents = eventNames.length > 0;

	const paramsSchema = generateParametersSchema(params);
	const optionsSchema = generateOptionsSchema(optionalParameters);

	// Extract schema imports (for params)
	const inputSchemas = extractInputSchemas(operation);

	// Schema imports (value imports for runtime use in params)
	const schemaImports =
		inputSchemas.length > 0
			? `import { ${inputSchemas.map((s) => `${s}Schema`).join(", ")} } from "${typesImportPath}";\n`
			: "";

	// Handler import (local module)
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Service imports (auth + event services from ../../services)
	const allInvariantDefs = [...preInvariants, ...postInvariants];
	const needsAuthService =
		hasInvariants &&
		(allInvariantDefs.some((inv) => inv.scope.kind === "context") ||
			allInvariantDefs.some((inv) =>
				conditionReferencesCurrentUser(inv.condition),
			));
	const serviceImports: string[] = [];
	if (needsAuthService) serviceImports.push("AuthService");
	if (hasEvents)
		serviceImports.push("EventEmitter", "EventStore", "EventSubscriber");
	const serviceImport =
		serviceImports.length > 0
			? `import { ${serviceImports.join(", ")} } from "../../services";\n`
			: "";

	// Invariant imports (validators and context type)
	// Only import context-scoped invariants (entity-scoped get TODO comments)
	const allInvariants = [...preInvariants, ...postInvariants];
	const contextScopedInvariants = allInvariants.filter(
		(inv) => inv.scope.kind === "context",
	);
	const invariantValidatorNames = contextScopedInvariants.map(
		(inv) => `validate${inv.name}`,
	);
	// Only import validators when there are context-scoped invariants to validate
	const invariantImport =
		invariantValidatorNames.length > 0
			? `import { ${invariantValidatorNames.join(", ")} } from "../../invariants";\n`
			: "";

	// Re-export handler (not errors - they may collide across operations)
	const reExports = ['export * from "./handler";', ""].join("\n");

	// Build imports in correct order for perfectionist/sort-imports:
	// 1. @scoped packages (alphabetically)
	// 2. External packages (effect)
	// 3. Blank line
	// 4. Relative imports (./handler, ../../services)
	const relativeImports = [
		...(schemaImports ? [schemaImports.trim()] : []),
		...(serviceImport ? [serviceImport.trim()] : []),
		...(invariantImport ? [invariantImport.trim()] : []),
		handlerImport.trim(),
	].filter((line) => line !== "");

	const imports = sortImports(
		[
			'import { defineOperation } from "@morph/operation";',
			'import { Effect } from "effect";',
			'import * as S from "effect/Schema";',
			"",
			...relativeImports,
		].join("\n"),
	);

	const header = [
		"// Generated operation - delegates to injected handler",
		"// Do not edit - regenerate from schema",
		"",
		imports,
		"",
		reExports,
	].join("\n");

	// JSDoc for the operation
	const jsdoc = operation.description
		? [`/**`, ` * ${operation.description}`, ` */`].join("\n") + "\n"
		: "";

	// Generate execute body - with or without event emission and invariants
	const simpleExecute = `Effect.flatMap(${handlerName}, (handler) =>
${indent(`handler.handle(params, options),`, 3)}
${indent(`)`, 2)}`;

	const executeBody = hasInvariants
		? generateExecuteWithInvariants(
				name,
				handlerName,
				preInvariants,
				postInvariants,
				eventNames,
			)
		: eventNames.length === 0
			? simpleExecute
			: generateExecuteWithEvents(handlerName, eventNames);

	const body = [
		jsdoc + `export const ${name} = defineOperation({`,
		`\tname: "${name}",`,
		`\tdescription: "${operation.description}",`,
		`\tparams: ${paramsSchema},`,
		`\toptions: ${optionsSchema},`,
		`\texecute: (params, options) =>`,
		`\t\t${executeBody},`,
		`});`,
		"",
	].join("\n");

	return header + body;
};

// Re-export from submodules for backwards compatibility
export {
	describeOutput,
	extractInputSchemas,
	extractOutputTypes,
} from "./output-types";
export { generateFunctionOperation } from "./function";
