/**
 * Handler implementation template generation for operations.
 *
 * Templates are generated in core packages but NOT imported.
 * They serve as starting points for hand-written implementations
 * in impls packages.
 */
import type {
	AggregateRef,
	DomainSchema,
	GeneratedFile,
	OperationDef,
} from "@morph/domain-schema";

import {
	getOperationAggregates,
	getOperationsFlat,
	isDomainService,
} from "@morph/domain-schema";
import { indent, sortImports, toKebabCase, toPascalCase } from "@morph/utils";

import { describeOutput, extractOutputTypes } from "./operation";

/**
 * Generate a template handler implementation file.
 * This template is NOT imported by the core package.
 * It's copied to impls packages where it becomes hand-maintained.
 */
export const generateHandlerImplTemplate = (
	name: string,
	operation: OperationDef,
	typesImportPath = "../../schemas",
	aggregates?: readonly AggregateRef[],
): string => {
	const pascalName = toPascalCase(name);
	const handlerName = `${pascalName}Handler`;

	// Error imports - from DSL package (value imports for constructing errors)
	const hasErrors = operation.errors.length > 0;
	const firstError = operation.errors[0];
	const firstErrorName = firstError ? `${firstError.name}Error` : undefined;

	// For stubs without errors, we need the output type for the type assertion
	// Extract only output types needed for the succeed case
	const outputTypes = extractOutputTypes(operation);

	// Check if this is a domain service (has aggregate refs)
	const isDomService = aggregates && aggregates.length > 0;
	const aggregateScope = isDomService
		? aggregates.map((a) => `${a.aggregate} (${a.access})`).join(", ")
		: undefined;

	// Build repository imports for domain services
	const repositoryImports = isDomService
		? aggregates
				.map((a) => `${a.aggregate}Repository`)
				.sort()
				.join(", ")
		: undefined;

	// Build imports from DSL package
	const schemaImports =
		!hasErrors && outputTypes.length > 0
			? `import type { ${outputTypes.join(", ")} } from "${typesImportPath}";\n`
			: "";
	const errorImport =
		hasErrors && firstErrorName
			? `import { ${firstErrorName} } from "${typesImportPath}";\n`
			: "";

	// Handler import (handler.ts is in same operation module)
	const handlerImport = `import { ${handlerName} } from "./handler";\n`;

	// Service imports (repositories for domain services)
	const serviceImport = repositoryImports
		? `import { ${repositoryImports} } from "../../services";\n`
		: "";

	// Generate return type
	const outputType = describeOutput(operation);

	// Generate fail expression for stub
	const failExpr =
		hasErrors && firstErrorName
			? `Effect.fail(new ${firstErrorName}({ message: "Not implemented" }))`
			: `Effect.succeed({} as ${outputType})`;

	// Build imports in correct order
	const typeImportLines = schemaImports ? [schemaImports.trim()] : [];
	const relativeImportLines = [
		...(errorImport ? [errorImport.trim()] : []),
		handlerImport.trim(),
		...(serviceImport ? [serviceImport.trim()] : []),
	];

	const importBlock = sortImports(
		[
			...typeImportLines,
			'import { Effect, Layer } from "effect";',
			...relativeImportLines,
		].join("\n"),
	);

	const header = [
		"// Template for implementing the handler.",
		"// This file is NOT imported by the core package.",
		"// Copy to your impls package and implement the logic.",
		"",
		importBlock,
		"",
	].join("\n");

	// Build JSDoc with domain service info if applicable
	const jsdocLines = [
		`/**`,
		` * Implementation of ${name} operation.`,
		` * ${operation.description}`,
		...(aggregateScope
			? [` *`, ` * Domain Service: coordinates ${aggregateScope}`]
			: []),
		` */`,
	];

	// For domain services, use Layer.effect to capture repos at layer-construction time
	// This ensures the handle method returns Effect<T, E, never> as the interface expects
	const repoYields = (aggregates ?? [])
		.map(
			(a) =>
				`const ${a.aggregate.toLowerCase()}Repo = yield* ${a.aggregate}Repository;`,
		)
		.join("\n");

	const availableRepos = (aggregates ?? [])
		.map((a) => `${a.aggregate.toLowerCase()}Repo`)
		.join(", ");

	const domainServiceHandleBody = `// TODO: Implement ${name}
// Params: ${Object.keys(operation.input).join(", ")}
// Available repos: ${availableRepos}
return yield* ${failExpr};`;

	const regularHandleBody = `// TODO: Implement ${name}
// Params: ${Object.keys(operation.input).join(", ")}
return yield* ${failExpr};`;

	const body = isDomService
		? [
				...jsdocLines,
				`export const ${handlerName}Live = Layer.effect(`,
				indent(`${handlerName},`, 1),
				indent(`Effect.gen(function* () {`, 1),
				indent(repoYields, 2),
				``,
				indent(`return {`, 2),
				indent(`handle: (_params, _options) =>`, 3),
				indent(`Effect.gen(function* () {`, 4),
				indent(domainServiceHandleBody, 5),
				indent(`}),`, 4),
				indent(`};`, 2),
				indent(`}),`, 1),
				`);`,
				"",
			].join("\n")
		: [
				...jsdocLines,
				`export const ${handlerName}Live = Layer.succeed(`,
				indent(`${handlerName},`, 1),
				indent(`{`, 1),
				indent(`handle: (_params, _options) =>`, 2),
				indent(`Effect.gen(function* () {`, 3),
				indent(regularHandleBody, 4),
				indent(`}),`, 3),
				indent(`},`, 1),
				`);`,
				"",
			].join("\n");

	return header + body;
};

/**
 * Generate all handler implementation template files for a schema.
 * These templates are NOT imported - they serve as starting points
 * for hand-written implementations in impls packages.
 */
export const generateHandlerImplTemplates = (
	schema: DomainSchema,
	typesImportPath = "../../schemas",
): readonly GeneratedFile[] => {
	const operations = getOperationsFlat(schema);

	// Templates are always regenerated (not scaffolds)
	// They're just reference files, not meant to be imported
	return Object.entries(operations).map(([name, operation]) => {
		// Get aggregate info for domain services
		const aggregates = isDomainService(schema, name)
			? getOperationAggregates(schema, name)
			: undefined;

		return {
			content: generateHandlerImplTemplate(
				name,
				operation,
				typesImportPath,
				aggregates,
			),
			filename: `operations/${toKebabCase(name)}/impl.template.ts`,
		};
	});
};
