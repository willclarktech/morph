/**
 * DSL Generator
 *
 * Generates typed DSL operations from a DomainSchema.
 * The generated DSL provides type-safe operation constructors
 * that can be used in test scenarios.
 */
import type {
	ContextDef,
	DomainSchema,
	GeneratedFile,
	GenerationResult,
} from "@morph/domain-schema";

import { generateDslReadme } from "./readme-generation";
import { generateOperation } from "./type-codegen";
import { collectTypeImports, getContextOperations } from "./type-collection";

/**
 * Check if a context has operations (commands or queries).
 * Functions are not operations - they don't need defineOp wrappers.
 */
const hasOperations = (context: ContextDef): boolean =>
	Object.keys(context.commands).length > 0 ||
	Object.keys(context.queries).length > 0;

export interface GenerateOptions {
	/** Package name (required if standalone) */
	readonly packageName?: string;
	/** Package scope (required if standalone) */
	readonly packageScope?: string;
	/** Generate as standalone package with package.json */
	readonly standalone?: boolean;
	/** Import path for types (e.g., "./schemas" for standalone or "@myapp/core" for embedded) */
	readonly typesImportPath?: string;
}

const DEFAULT_OPTIONS = {
	standalone: false,
	typesImportPath: "../schemas",
};

/**
 * Recursively sort object keys alphabetically for consistent JSON output.
 */
const sortObjectKeys = <T extends Record<string, unknown>>(input: T): T => {
	if (Array.isArray(input)) {
		return input as T;
	}
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		sorted[key] =
			typeof value === "object" && value !== null && !Array.isArray(value)
				? sortObjectKeys(value as Record<string, unknown>)
				: value;
	}
	return sorted as T;
};

export const generate = (
	schema: DomainSchema,
	options?: GenerateOptions,
): GenerationResult => {
	const merged = { ...DEFAULT_OPTIONS, ...options };
	const files: GeneratedFile[] = [];

	const typesImportPath =
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- options can override with undefined
		merged.typesImportPath ?? (merged.standalone ? "./schemas" : "../schemas");

	const contextNames = Object.keys(schema.contexts);

	for (const [contextName, context] of Object.entries(schema.contexts)) {
		const content = generateContextDsl(contextName, context, typesImportPath);
		files.push({
			content,
			filename: `src/${contextName}.ts`,
		});
	}

	if (contextNames.length > 0) {
		const indexContent = generateIndex(schema);
		files.push({
			content: indexContent,
			filename: "src/index.ts",
		});
	}

	if (merged.standalone && merged.packageName && merged.packageScope) {
		files.push({
			content: generatePackageJson(merged.packageName, merged.packageScope),
			filename: "package.json",
		});
		files.push({
			content: generateTsConfig(merged.packageScope),
			filename: "tsconfig.json",
		});
		files.push({
			content: generateEslintConfig(merged.packageScope),
			filename: "eslint.config.ts",
		});
		files.push({
			content: generateDslReadme(schema, merged.packageScope),
			filename: "README.md",
		});
	}

	return { files };
};

const generatePackageJson = (name: string, scope: string): string => {
	const package_ = {
		$schema: "https://json.schemastore.org/package.json",
		dependencies: {
			"@morph/operation": "workspace:*",
			effect: "^3.19.13",
		},
		devDependencies: {
			[`@${scope}/eslint-config`]: "workspace:*",
			[`@${scope}/tsconfig`]: "workspace:*",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
		exports: {
			".": "./src/index.ts",
			"./schemas": "./src/schemas.ts",
		},
		name: `@${scope}/${name}`,
		private: true,
		scripts: {
			"build:check": "tsc --noEmit",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
		},
		type: "module",
		version: "0.0.0",
	};
	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};

const generateTsConfig = (scope: string): string =>
	`{
	"extends": "@${scope}/tsconfig/base.json",
	"compilerOptions": {
		"rootDir": ".",
		"outDir": "dist"
	},
	"include": ["src"]
}
`;

const generateEslintConfig = (scope: string): string =>
	`import { configs } from "@${scope}/eslint-config";

export default configs.generated;
`;

const generateIndex = (schema: DomainSchema): string => {
	const contextExports = Object.keys(schema.contexts)
		.sort()
		.map((name) => `export * from "./${name}";`)
		.join("\n");

	return `// Generated from DomainSchema: ${schema.name}
// Do not edit manually

// Types
export * from "./schemas";

// DSL operations
${contextExports}
`;
};

const generateContextDsl = (
	contextName: string,
	context: ContextDef,
	typesImportPath: string,
): string => {
	const lines: string[] = [
		`// Generated DSL for context: ${contextName}`,
		"// Do not edit manually",
		"",
	];

	// Only import defineOp if context has operations (commands/queries)
	// Functions don't need defineOp wrappers
	if (hasOperations(context)) {
		lines.push('import { defineOp } from "@morph/operation";', "");
	}

	const typeImports = collectTypeImports(context);
	if (typeImports.length > 0) {
		lines.push(
			`import type { ${typeImports.join(", ")} } from "${typesImportPath}";`,
			"",
		);
	}

	// Generate defineOp wrappers only for operations (commands/queries)
	// Functions are pure and come from impls, not the DSL
	const operations = getContextOperations(context);
	for (const [opName, opDef] of Object.entries(operations)) {
		const opCode = generateOperation(opName, opDef);
		lines.push(opCode, "");
	}

	return lines.join("\n");
};

export {
	type GeneratedFile,
	type GenerationResult,
} from "@morph/domain-schema";
