import type {
	DomainSchema,
	GeneratedFile,
	GenerationResult,
} from "@morphdsl/domain-schema";

import {
	generateArbitraries,
	generateSchemas,
	generateUnionTypes,
} from "./generators";

export interface GenerateOptions {
	/** Generate fast-check Arbitraries for property testing (default: false) */
	readonly includeArbitraries?: boolean;
	/** Generate Effect/Schema definitions (default: true) */
	readonly includeSchemas?: boolean;
	/** Generate named union type aliases (default: true) */
	readonly includeUnions?: boolean;
	/** Combine all output into a single file (default: false) */
	readonly singleFile?: boolean;
}

const DEFAULT_OPTIONS: Required<GenerateOptions> = {
	includeArbitraries: false,
	includeSchemas: true,
	includeUnions: true,
	singleFile: false,
};

/**
 * Generate TypeScript types and Effect/Schema definitions from a DomainSchema.
 */
export const generate = (
	schema: DomainSchema,
	options?: GenerateOptions,
): GenerationResult => {
	const merged = { ...DEFAULT_OPTIONS, ...options };

	return merged.singleFile
		? generateSingleFile(schema, merged)
		: generateMultipleFiles(schema, merged);
};

const generateSingleFile = (
	schema: DomainSchema,
	options: Required<GenerateOptions>,
): GenerationResult => {
	const header = [
		`// Generated from DomainSchema: ${schema.name}`,
		"// Do not edit manually",
		"",
	];

	const sections = [
		options.includeUnions ? generateUnionTypes(schema) : "",
		options.includeSchemas ? generateSchemas(schema) : "",
		options.includeArbitraries ? generateArbitraries(schema) : "",
	].filter((s) => s !== "");

	return {
		files: [
			{
				content: [...header, ...sections.flatMap((s) => [s, ""])].join("\n"),
				filename: "src/schemas.ts",
			},
		],
	};
};

interface FileSpec {
	readonly content: string;
	readonly filename: string;
	readonly include: boolean;
}

const generateMultipleFiles = (
	schema: DomainSchema,
	options: Required<GenerateOptions>,
): GenerationResult => {
	const header = `// Generated from DomainSchema: ${schema.name}\n// Do not edit manually\n\n`;

	const specs: readonly FileSpec[] = [
		{
			content: generateUnionTypes(schema),
			filename: "unions.ts",
			include: options.includeUnions,
		},
		{
			content: generateSchemas(schema),
			filename: "schemas.ts",
			include: options.includeSchemas,
		},
		{
			content: generateArbitraries(schema),
			filename: "arbitraries.ts",
			include: options.includeArbitraries,
		},
	];

	const files = specs
		.filter((spec) => spec.include && spec.content !== "")
		.map((spec) => ({
			content: header + spec.content,
			filename: `src/${spec.filename}`,
		}));

	return { files };
};

/**
 * Generate a schema.ts wrapper that imports and parses schema.json.
 * This provides type-safe access to the domain schema at runtime.
 */
export const generateSchemaWrapper = (
	schema: DomainSchema,
	schemaJsonPath = "./schema.json",
): GeneratedFile => {
	const exportName = `${schema.name.toLowerCase()}Schema`;
	return {
		content: `import { parseSchema } from "@morphdsl/domain-schema";

import schemaJson from "${schemaJsonPath}";

/**
 * ${schema.name} domain schema.
 * Parsed and validated at import time using Effect Schema.
 */
export const ${exportName} = parseSchema(schemaJson);
`,
		filename: "schema.ts",
	};
};

export {
	type GeneratedFile,
	type GenerationResult,
} from "@morphdsl/domain-schema";
