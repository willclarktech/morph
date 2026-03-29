import type {
	DomainSchema,
	Extensions,
	GeneratedFile,
	GenerationResult,
} from "@morphdsl/domain-schema";

import {
	getOperationPostInvariantDefs,
	getOperationPreInvariantDefs,
} from "@morphdsl/domain-schema";
import { toKebabCase } from "@morphdsl/utils";

import { filterFunctions, filterOperations } from "./filter-operations";
import {
	generateImplTemplateFiles,
	generateInvariantFiles,
	generateLayerSelectorFile,
	generateMockFiles,
	generateSubscriberFiles,
} from "./generate-groups";
import {
	generateDefaultImpls,
	generateFunctionHandlers,
	generateFunctionOperation,
	generateHandlers,
	generateMainBarrel,
	generateMocks,
	generateOperation,
	generateOperationsBarrel,
	generateServices,
	generateSubscribers,
	generateSubscribersBarrel,
} from "./generators";

export interface GenerateOperationsOptions {
	/** Environment variable prefix (e.g., "TODO_APP"). Defaults to schema name in SCREAMING_SNAKE_CASE. */
	readonly envPrefix?: string;
	/** Generate handler implementation scaffolds (default: false) */
	readonly generateImpls?: boolean;
	/** Extensions configuration for conditional generation */
	readonly extensions?: Extensions | undefined;
	/** Output directory prefix (default: "src") */
	readonly outputDir?: string;
	/** Project name for Context tag namespacing (e.g., "todo-app" -> "@todo-app/Handler") */
	readonly projectName?: string;
	/** Filter operations by tags (e.g., ["@cli"]) */
	readonly tags?: readonly string[];
	/** Import path for types/schemas (default: relative paths like "../../schemas") */
	readonly typesImportPath?: string;
}

const DEFAULT_OPTIONS = {
	generateImpls: false,
	outputDir: "src",
	projectName: "app",
	tags: [] as readonly string[],
	typesImportPath: "",
};

/**
 * Generate operation files from a DomainSchema.
 */
export const generate = (
	schema: DomainSchema,
	options?: GenerateOperationsOptions,
): GenerationResult => {
	const merged = { ...DEFAULT_OPTIONS, ...options };
	const prefix = merged.outputDir ? `${merged.outputDir}/` : "";

	const operations = filterOperations(schema, merged.tags);
	const functions = filterFunctions(schema, merged.tags);

	// Determine types import path (default to relative if not specified)
	const typesPath = merged.typesImportPath || "../../schemas";
	const servicesTypesPath = merged.typesImportPath || "../schemas";

	// Generate individual operation files (each operation is a module)
	const operationFiles = Object.entries(operations).map(
		([name, operation]) => ({
			content: generateOperation(name, operation, {
				postInvariants: getOperationPostInvariantDefs(schema, name),
				preInvariants: getOperationPreInvariantDefs(schema, name),
				typesImportPath: typesPath,
			}),
			filename: `${prefix}operations/${toKebabCase(name)}/index.ts`,
		}),
	);

	// Generate individual function files (each function is a module)
	const functionFiles = Object.entries(functions).map(([name, function_]) => ({
		content: generateFunctionOperation(name, function_, typesPath),
		filename: `${prefix}operations/${toKebabCase(name)}/index.ts`,
	}));

	// Generate barrel files
	const staticFiles: readonly GeneratedFile[] = [
		{
			content: generateOperationsBarrel(
				schema,
				merged.tags,
				merged.generateImpls,
			),
			filename: `${prefix}operations/index.ts`,
		},
		{
			content: generateMainBarrel(schema),
			filename: `${prefix}index.ts`,
		},
	];

	// Generate handler interfaces and tags for operations
	const handlerFiles = generateHandlers(
		schema,
		typesPath,
		merged.projectName,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	// Generate handler interfaces for functions
	const functionHandlerFiles = generateFunctionHandlers(
		schema,
		typesPath,
		merged.projectName,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	// Generate Effect services for aggregate roots
	const serviceFiles = generateServices(
		schema,
		servicesTypesPath,
		merged.extensions,
		merged.envPrefix,
		merged.projectName,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	// Generate impl templates when enabled (reference files, not imported)
	const implTemplateFiles: readonly GeneratedFile[] = merged.generateImpls
		? generateImplTemplateFiles(schema, typesPath, prefix)
		: [];

	// Generate mock files when enabled
	const mockFiles: readonly GeneratedFile[] = merged.generateImpls
		? generateMockFiles(schema, typesPath, prefix)
		: [];

	// Generate default impl files (scaffold - won't overwrite existing impls)
	const defaultImplFiles: readonly GeneratedFile[] = merged.generateImpls
		? generateDefaultImpls(schema).map((file) => ({
				...file,
				filename: `${prefix}${file.filename}`,
			}))
		: [];

	// Generate layer selector when impls are enabled
	const envPrefix =
		merged.envPrefix ?? schema.name.toUpperCase().replaceAll(/[- ]/g, "_");
	const layerSelectorFile: readonly GeneratedFile[] = merged.generateImpls
		? [generateLayerSelectorFile(envPrefix, prefix)]
		: [];

	// Generate subscriber interfaces
	const subscriberFiles = generateSubscribers(
		schema,
		typesPath,
		merged.projectName,
	).map((file) => ({
		...file,
		filename: `${prefix}${file.filename}`,
	}));

	// Generate subscriber implementation scaffolds when impls are enabled
	const subscriberImplFiles: readonly GeneratedFile[] = merged.generateImpls
		? generateSubscriberFiles(schema, prefix)
		: [];

	// Generate subscribers barrel (only if there are subscribers)
	const subscribersBarrelContent = generateSubscribersBarrel(
		schema,
		merged.generateImpls,
	);
	const subscribersBarrelFiles: readonly GeneratedFile[] =
		subscribersBarrelContent
			? [
					{
						content: subscribersBarrelContent,
						filename: `${prefix}subscribers/index.ts`,
					},
				]
			: [];

	// Generate test infrastructure (mocks for testing)
	const testFiles: readonly GeneratedFile[] = [
		{
			content: generateMocks(schema),
			filename: `${prefix}mocks/deps.ts`,
		},
	];

	// Generate invariant validators
	const invariantFiles = generateInvariantFiles(
		schema,
		servicesTypesPath,
		prefix,
	);

	return {
		files: [
			...operationFiles,
			...functionFiles,
			...handlerFiles,
			...functionHandlerFiles,
			...implTemplateFiles,
			...mockFiles,
			...defaultImplFiles,
			...layerSelectorFile,
			...subscriberFiles,
			...subscriberImplFiles,
			...subscribersBarrelFiles,
			...staticFiles,
			...serviceFiles,
			...testFiles,
			...invariantFiles,
		],
	};
};

export {
	type GeneratedFile,
	type GenerationResult,
} from "@morphdsl/domain-schema";
