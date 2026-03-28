#!/usr/bin/env bun
/**
 * Regenerate morph from its own schema.
 *
 * This script automates the process of generating morph packages and
 * wiring up the necessary dependencies and fixtures.
 *
 * Usage:
 *   bun scripts/regenerate-morph.ts
 */
import { Effect } from "effect";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
// eslint-disable-next-line import/default -- prettier uses CJS-compat exports that confuse static analysis
import prettier from "prettier";

import type {
	ContractDef,
	DomainSchema,
} from "../contexts/generation/domain-schema/src/schemas";

import { parseSchema } from "../contexts/generation/domain-schema/src/schemas";
import { generateContractTests } from "../contexts/generation/generators/contracts/src/index";
import { executeGenerate } from "../contexts/generation/impls/src/generate";
import { sortFileImports } from "../contexts/generation/utils/src/imports";
import {
	compile,
	compileContract,
} from "../contexts/schema-dsl/compiler/src/index";
import { parse } from "../contexts/schema-dsl/parser/src/index";

const ROOT_DIR = path.join(import.meta.dir, "..");
const MORPH_DIR = ROOT_DIR;
const SCHEMA_MORPH_PATH = path.join(MORPH_DIR, "schema.morph");
const RESOLVED_SCHEMA_PATH = path.join(MORPH_DIR, "schema-resolved.json");
const EXTENSIONS_DIR = path.join(MORPH_DIR, "extensions");
const FIXTURES_DIR = path.join(MORPH_DIR, "fixtures");

/**
 * Compile schema.morph → DomainSchema, writing schema-resolved.json as a side effect.
 * Generated TS files import from schema-resolved.json, so it must stay up-to-date.
 */
const compileMorphSchema = (): DomainSchema | undefined => {
	console.info("Compiling schema.morph...");

	try {
		const source = readFileSync(SCHEMA_MORPH_PATH, "utf8");
		const parseResult = parse(source);
		if (parseResult.errors.length > 0) {
			const msgs = parseResult.errors.map(
				(error) =>
					`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
			);
			console.error(`Parse errors in schema.morph:\n${msgs.join("\n")}`);
			return undefined;
		}

		if (!parseResult.ast) return undefined;
		const compileResult = compile(parseResult.ast);
		if (compileResult.errors.length > 0) {
			const msgs = compileResult.errors.map(
				(error) =>
					`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
			);
			console.error(`Compile errors in schema.morph:\n${msgs.join("\n")}`);
			return undefined;
		}

		const schema = parseSchema(compileResult.schema);
		writeFileSync(
			RESOLVED_SCHEMA_PATH,
			JSON.stringify(schema, undefined, "\t") + "\n",
		);
		console.info("Wrote schema-resolved.json");
		return schema;
	} catch (error) {
		console.error("Failed to compile schema.morph:", error);
		return undefined;
	}
};

/**
 * Compile extension schema.morph files → schema.json.
 * Each extension has a single-context .morph file. We parse it, compile to
 * DomainSchema, extract the context fragment + contracts, and write schema.json.
 */
const compileExtensionSchemas = (): void => {
	console.info("Compiling extension schemas...");

	const extensionDirectories = readdirSync(EXTENSIONS_DIR, {
		withFileTypes: true,
	})
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	for (const extensionName of extensionDirectories) {
		const morphPath = path.join(EXTENSIONS_DIR, extensionName, "schema.morph");
		if (!existsSync(morphPath)) continue;

		const source = readFileSync(morphPath, "utf8");
		const parseResult = parse(source);
		if (parseResult.errors.length > 0) {
			const msgs = parseResult.errors.map(
				(error) =>
					`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
			);
			console.error(
				`Parse errors in ${extensionName}/schema.morph:\n${msgs.join("\n")}`,
			);
			continue;
		}

		if (!parseResult.ast) continue;
		const ast = parseResult.ast;
		const compileResult = compile(ast);
		if (compileResult.errors.length > 0) {
			const msgs = compileResult.errors.map(
				(error) =>
					`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
			);
			console.error(
				`Compile errors in ${extensionName}/schema.morph:\n${msgs.join("\n")}`,
			);
			continue;
		}

		if (!compileResult.schema) continue;
		// Extract the single context as a flat fragment
		const contextAst = ast.contexts[0];
		const contextDef = compileResult.schema.contexts[contextAst.name];

		// Build extension JSON object (flat context fragment, not wrapped in domain)
		const extensionJson: Record<string, unknown> = {
			description: contextDef.description,
			entities: contextDef.entities,
		};

		if (contextDef.dependencies.length > 0) {
			extensionJson.dependencies = contextDef.dependencies;
		}

		// Only include non-empty optional collections
		if (contextDef.ports && Object.keys(contextDef.ports).length > 0) {
			extensionJson.ports = contextDef.ports;
		}
		if (contextDef.types && Object.keys(contextDef.types).length > 0) {
			extensionJson.types = contextDef.types;
		}
		if (contextDef.errors && Object.keys(contextDef.errors).length > 0) {
			extensionJson.errors = contextDef.errors;
		}
		if (contextDef.functions && Object.keys(contextDef.functions).length > 0) {
			extensionJson.functions = contextDef.functions;
		}

		// Compile contracts from AST (not in ContextDef)
		if (contextAst.contracts.length > 0) {
			extensionJson.contracts = contextAst.contracts.map(compileContract);
		}

		extensionJson.invariants = contextDef.invariants;

		const jsonPath = path.join(EXTENSIONS_DIR, extensionName, "schema.json");
		writeFileSync(
			jsonPath,
			JSON.stringify(extensionJson, undefined, "\t") + "\n",
		);
		console.info(`  Compiled: ${extensionName}/schema.json`);
	}
};

/**
 * Run morph generate directly using the generation impls module.
 * This bypasses the CLI to avoid bootstrapping issues where the CLI
 * requires generated packages that don't exist yet.
 */
const runGenerate = async (schema: DomainSchema): Promise<boolean> => {
	console.info("Running morph generate...");

	try {
		const result = await Effect.runPromise(executeGenerate(schema, "Morph"));

		// Files that are hand-written in the morph repo and should not be overwritten
		const SKIP_FILES = new Set(["README.md"]);

		// Write generated files
		for (const file of result.files) {
			if (SKIP_FILES.has(file.filename)) {
				console.info(`Skipped: ${file.filename} (hand-written)`);
				continue;
			}
			const filePath = path.join(MORPH_DIR, file.filename);
			const dir = path.dirname(filePath);
			mkdirSync(dir, { recursive: true });
			writeFileSync(filePath, file.content);
			console.info(`Created: ${file.filename}`);
		}

		console.info(`Wrote ${result.files.length} files`);
		return true;
	} catch (error) {
		console.error("Failed to run morph generate:", error);
		return false;
	}
};

/**
 * Generate contract test suites from extension schemas.
 * Reads contracts from extension schema.json files and generates
 * property-based test suites for each port interface.
 */
const generateContracts = (schema: DomainSchema): void => {
	console.info("Generating contract tests...");

	const extensionSchemaFiles = [
		path.join(MORPH_DIR, "extensions/storage/schema.json"),
		path.join(MORPH_DIR, "extensions/eventstore/schema.json"),
	];

	const allContracts: ContractDef[] = [];
	for (const schemaFile of extensionSchemaFiles) {
		if (!existsSync(schemaFile)) continue;
		const raw = JSON.parse(readFileSync(schemaFile, "utf8")) as {
			contracts?: readonly ContractDef[];
		};
		if (raw.contracts) {
			allContracts.push(...raw.contracts);
		}
	}

	if (allContracts.length === 0) return;

	const storageBackends = schema.extensions?.storage?.backends ?? [
		"memory",
		"jsonfile",
		"sqlite",
	];
	const eventStoreBackends = schema.extensions?.eventStore?.backends ?? [
		"memory",
		"jsonfile",
	];

	const files = generateContractTests(allContracts, {
		storageBackends,
		eventStoreBackends,
		outputDir: "tests/contracts/src",
	});

	for (const file of files) {
		const filePath = path.join(MORPH_DIR, file.filename);
		const dir = path.dirname(filePath);
		mkdirSync(dir, { recursive: true });
		writeFileSync(filePath, file.content);
		console.info(`  Created: ${file.filename}`);
	}
};

/**
 * Copy hand-written scenario fixtures over the generated scaffold.
 * Mirrors copyScenariosFixtures() in generate-examples.ts.
 */
const copyScenariosFixtures = (): void => {
	const scenariosFixturesDir = path.join(FIXTURES_DIR, "scenarios");
	if (!existsSync(scenariosFixturesDir)) return;

	console.info("Copying scenario fixtures...");

	const files = readdirSync(scenariosFixturesDir).filter((f) =>
		f.endsWith(".ts"),
	);
	const targetDir = path.join(MORPH_DIR, "tests/scenarios/src");

	for (const file of files) {
		const source = path.join(scenariosFixturesDir, file);
		const target = path.join(targetDir, file);
		copyFileSync(source, target);
		console.info(`  Copied: ${file}`);
	}
};

/**
 * Get all generated package directories.
 */
const getGeneratedPackageDirectories = (): string[] => {
	const dirs: string[] = [];

	// Per-context DSL/core packages in contexts/
	const contextsDir = path.join(MORPH_DIR, "contexts");
	if (existsSync(contextsDir)) {
		const contexts = readdirSync(contextsDir, { withFileTypes: true });
		for (const context of contexts) {
			if (context.isDirectory()) {
				// Check for dsl/ and core/ subdirectories
				const dslDir = path.join(contextsDir, context.name, "dsl");
				const coreDir = path.join(contextsDir, context.name, "core");
				if (existsSync(dslDir)) {
					dirs.push(`contexts/${context.name}/dsl`);
				}
				if (existsSync(coreDir)) {
					dirs.push(`contexts/${context.name}/core`);
				}
			}
		}
	}

	// Apps, libs, and tests
	dirs.push(
		"apps/api",
		"apps/cli",
		"apps/mcp",
		"apps/vscode",
		"libs/client",
		"tests/scenarios",
	);

	return dirs;
};

/**
 * Fix package.json files to use correct scopes and configs.
 */
const fixPackageJsonFiles = (): void => {
	console.info("Fixing package.json files...");

	const packageDirectories = getGeneratedPackageDirectories();

	for (const dir of packageDirectories) {
		const packagePath = path.join(MORPH_DIR, dir, "package.json");
		let content: string;
		try {
			content = readFileSync(packagePath, "utf8");
		} catch {
			continue;
		}

		// Fix package name references
		content = content.replaceAll("@Morph/", "@morph/");

		writeFileSync(packagePath, content);
	}
};

/**
 * Fix tsconfig.json files to use relative paths to morph config.
 * Packages in contexts/{context}/dsl/ or contexts/{context}/core/ are 4 levels deep.
 */
const fixTsconfigFiles = (): void => {
	console.info("Fixing tsconfig.json files...");

	const packageDirectories = getGeneratedPackageDirectories();

	for (const dir of packageDirectories) {
		const tsconfigPath = path.join(MORPH_DIR, dir, "tsconfig.json");
		try {
			readFileSync(tsconfigPath);
		} catch {
			continue;
		}

		// contexts/*/dsl and contexts/*/core need 3 levels, apps/* and tests/* need 2 levels
		const levels = dir.startsWith("contexts/") ? 3 : 2;
		const prefix = "../".repeat(levels);

		// Core packages need to exclude template files
		const isCore = dir.endsWith("/core");
		const exclude = isCore ? ',\n\t"exclude": ["src/**/*.template.ts"]' : "";

		const tsconfigContent = `{
	"extends": "${prefix}config/tsconfig/bun.json",
	"include": ["src"]${exclude}
}
`;

		writeFileSync(tsconfigPath, tsconfigContent);
	}
};

const fixVsCodeApp = async (): Promise<void> => {
	const vscodePath = path.join(MORPH_DIR, "apps/vscode");
	if (!existsSync(vscodePath)) return;

	console.info("Fixing VSCode app...");

	const tsconfigContent = `{
	"extends": "../../config/tsconfig/bun.json",
	"include": ["src"]
}
`;
	writeFileSync(path.join(vscodePath, "tsconfig.json"), tsconfigContent);

	try {
		const impls = await import("../contexts/schema-dsl/impls/src/grammar");
		const formatJson = async (object: unknown, filepath: string) =>
			prettier.format(JSON.stringify(object), {
				filepath,
				...(await prettier.resolveConfig(filepath, { editorconfig: true })),
			});
		const langConfigPath = path.join(vscodePath, "language-configuration.json");
		writeFileSync(
			langConfigPath,
			await formatJson(impls.languageConfiguration, langConfigPath),
		);
		const syntaxesDir = path.join(vscodePath, "syntaxes");
		mkdirSync(syntaxesDir, { recursive: true });
		const tmLangPath = path.join(syntaxesDir, "morph.tmLanguage.json");
		writeFileSync(
			tmLangPath,
			await formatJson(impls.textMateGrammar, tmLangPath),
		);
	} catch {
		console.info("  (grammar files will be written on next regeneration)");
	}
};

/**
 * Fix eslint.config.ts files to use morph config.
 */
const cliPackageDirectories = new Set(["apps/cli"]);
const customEslintDirectories = new Set(["contexts/schema-dsl/core"]);

const fixEslintConfigFiles = (): void => {
	console.info("Fixing eslint.config.ts files...");

	const packageDirectories = getGeneratedPackageDirectories();

	const eslintContent = `import { configs } from "@morph/eslint-config";

export default [{ ignores: ["**/*.template.ts"] }, ...configs.generated];
`;

	const cliEslintContent = `import { configs } from "@morph/eslint-config";

export default [{ ignores: ["**/*.template.ts"] }, ...configs.generated, ...configs.cli];
`;

	for (const dir of packageDirectories) {
		if (customEslintDirectories.has(dir)) continue;

		const eslintPath = path.join(MORPH_DIR, dir, "eslint.config.ts");
		try {
			readFileSync(eslintPath);
		} catch {
			continue;
		}

		writeFileSync(
			eslintPath,
			cliPackageDirectories.has(dir) ? cliEslintContent : eslintContent,
		);
	}
};

/**
 * Write handler and impl files that re-export from context-specific impls packages.
 * The actual implementations live in contexts/{context}/impls/ and are imported via re-exports.
 * This avoids type mismatches between generated handler interfaces and impl code.
 */
const writeImplsAndHandlers = (): void => {
	console.info("Writing impl and handler re-exports...");

	const fileContents = [
		// Handler re-exports (generation context)
		{
			path: "contexts/generation/core/src/operations/validate/handler.ts",
			content: `// Re-export handler interfaces from @morph/generation-impls

export { ValidateHandler } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/generate/handler.ts",
			content: `// Re-export handler interfaces from @morph/generation-impls

export { GenerateHandler, type GenerateOptions } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/init/handler.ts",
			content: `// Re-export handler interfaces from @morph/generation-impls

export { InitHandler } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/new-project/handler.ts",
			content: `// Re-export handler interfaces from @morph/generation-impls

export { NewProjectHandler, type NewProjectOptions } from "@morph/generation-impls";
`,
		},
		// Impl re-exports (generation context)
		{
			path: "contexts/generation/core/src/operations/validate/impl.ts",
			content: `// Re-export from @morph/generation-impls

export { ValidateHandlerLive } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/generate/impl.ts",
			content: `// Re-export from @morph/generation-impls

export {
	executeGenerate,
	generateEnvironmentExample,
	GenerateHandlerLive,
	type GenerateOptions,
	schemaHasTag,
} from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/init/impl.ts",
			content: `// Re-export from @morph/generation-impls

export { InitHandlerLive } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/generation/core/src/operations/new-project/impl.ts",
			content: `// Re-export from @morph/generation-impls

export { NewProjectHandlerLive } from "@morph/generation-impls";
`,
		},
		// Handler re-exports (schema-dsl context)
		{
			path: "contexts/schema-dsl/core/src/operations/parse-morph/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { ParseMorphHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/decompile-schema/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { DecompileSchemaHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/format-dsl/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { FormatDslHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/validate-dsl/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { ValidateDslHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-diagnostics/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetDiagnosticsHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-symbols/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetSymbolsHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-completions/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetCompletionsHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-hover/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetHoverHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-definition/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetDefinitionHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-folding-ranges/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { GetFoldingRangesHandler } from "@morph/schema-dsl-impls";
`,
		},
		// Impl re-exports (schema-dsl context)
		{
			path: "contexts/schema-dsl/core/src/operations/parse-morph/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { ParseMorphHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/decompile-schema/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { DecompileSchemaHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/format-dsl/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { FormatDslHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/validate-dsl/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { ValidateDslHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-diagnostics/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetDiagnosticsHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-symbols/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetSymbolsHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-completions/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetCompletionsHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-hover/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetHoverHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-definition/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetDefinitionHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/get-folding-ranges/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { GetFoldingRangesHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/template-schema/handler.ts",
			content: `// Re-export handler interfaces from @morph/schema-dsl-impls

export { TemplateSchemaHandler } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/operations/template-schema/impl.ts",
			content: `// Re-export from @morph/schema-dsl-impls

export { TemplateSchemaHandlerLive } from "@morph/schema-dsl-impls";
`,
		},
	];

	for (const { path: relativePath, content } of fileContents) {
		const target = path.join(MORPH_DIR, relativePath);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, content);
	}
};

/**
 * Fix layers.ts to re-export HandlersLayer and MockHandlersLayer from operations barrel.
 */
const fixLayersFiles = (): void => {
	console.info("Fixing layers.ts files...");

	const layersContent = `// Generated layers file
// Re-exports layer compositions from operations barrel

export { HandlersLayer, MockHandlersLayer } from "./operations";
`;

	// Fix generation-core layers.ts
	const generationLayersPath = path.join(
		MORPH_DIR,
		"contexts/generation/core/src/layers.ts",
	);
	if (existsSync(generationLayersPath)) {
		writeFileSync(generationLayersPath, layersContent);
	}

	// Fix schema-dsl-core layers.ts
	const schemaDslLayersPath = path.join(
		MORPH_DIR,
		"contexts/schema-dsl/core/src/layers.ts",
	);
	if (existsSync(schemaDslLayersPath)) {
		writeFileSync(schemaDslLayersPath, layersContent);
	}
};

/**
 * Add extra dependencies to core packages.
 * Generation-core re-exports from @morph/generation-impls which contains the actual implementations.
 */
const addCoreDependencies = (): void => {
	console.info("Adding core dependencies...");

	// Fix generation-core
	const generationCorePath = path.join(
		MORPH_DIR,
		"contexts/generation/core/package.json",
	);
	if (existsSync(generationCorePath)) {
		const packageJson = JSON.parse(
			readFileSync(generationCorePath, "utf8"),
		) as {
			dependencies?: Record<string, string>;
		};

		// Generation-core re-exports from @morph/generation-impls, which has all generator dependencies
		// fast-check is needed for mock implementations
		packageJson.dependencies = {
			...packageJson.dependencies,
			"@morph/generation-impls": "workspace:*",
			"fast-check": "^3.23.1",
		};

		writeFileSync(
			generationCorePath,
			JSON.stringify(packageJson, undefined, "\t") + "\n",
		);
	}

	// Fix schema-dsl-core
	const schemaDslCorePath = path.join(
		MORPH_DIR,
		"contexts/schema-dsl/core/package.json",
	);
	if (existsSync(schemaDslCorePath)) {
		const packageJson = JSON.parse(readFileSync(schemaDslCorePath, "utf8")) as {
			dependencies?: Record<string, string>;
		};

		packageJson.dependencies = {
			...packageJson.dependencies,
			"@morph/schema-dsl-impls": "workspace:*",
		};

		writeFileSync(
			schemaDslCorePath,
			JSON.stringify(packageJson, undefined, "\t") + "\n",
		);
	}
};

/**
 * Add exports for hand-written DSL fixture files (validation.ts).
 * DSL packages should be 100% generated - prose and text live in impls, re-exported from core.
 */
const addDslFixtureExports = (): void => {
	console.info("Adding DSL fixture exports...");

	// Add validation export to generation-dsl index.ts (validation types only)
	const generationIndexPath = path.join(
		MORPH_DIR,
		"contexts/generation/dsl/src/index.ts",
	);
	if (existsSync(generationIndexPath)) {
		let indexContent = readFileSync(generationIndexPath, "utf8");
		if (!indexContent.includes("validation")) {
			indexContent += '\n// Validation types\nexport * from "./validation";\n';
		}
		writeFileSync(generationIndexPath, indexContent);
	}
};

/**
 * Write prose re-export files in core packages.
 * Core re-exports prose from impls so consumers import from core, not impls.
 */
const writeProseReexports = (): void => {
	console.info("Writing prose re-exports in core packages...");

	const proseReexports = [
		{
			path: "contexts/generation/core/src/prose.ts",
			content: `// Re-export prose fixtures from impls

export { prose } from "@morph/generation-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/prose.ts",
			content: `// Re-export prose fixtures from impls

export { prose } from "@morph/schema-dsl-impls";
`,
		},
		{
			path: "contexts/schema-dsl/core/src/grammar.ts",
			content: `// Re-export grammar fixtures from impls

export { languageConfiguration, textMateGrammar } from "@morph/schema-dsl-impls";
`,
		},
	];

	for (const { path: relativePath, content } of proseReexports) {
		const target = path.join(MORPH_DIR, relativePath);
		if (existsSync(path.dirname(target))) {
			writeFileSync(target, content);
		}
	}
};

/**
 * Add prose exports to core index.ts files.
 */
const addCoreFixtureExports = (): void => {
	console.info("Adding core fixture exports...");

	// Add prose export to generation-core index.ts
	const generationIndexPath = path.join(
		MORPH_DIR,
		"contexts/generation/core/src/index.ts",
	);
	if (existsSync(generationIndexPath)) {
		let indexContent = readFileSync(generationIndexPath, "utf8");
		if (!indexContent.includes("prose")) {
			indexContent += '\n// Prose fixtures\nexport * from "./prose";\n';
		}
		writeFileSync(generationIndexPath, indexContent);
	}

	// Add prose and grammar exports to schema-dsl-core index.ts
	const schemaDslIndexPath = path.join(
		MORPH_DIR,
		"contexts/schema-dsl/core/src/index.ts",
	);
	if (existsSync(schemaDslIndexPath)) {
		let indexContent = readFileSync(schemaDslIndexPath, "utf8");
		if (!indexContent.includes("prose")) {
			indexContent += '\n// Prose fixtures\nexport * from "./prose";\n';
		}
		if (!indexContent.includes("grammar")) {
			indexContent += '\n// Grammar fixtures\nexport * from "./grammar";\n';
		}
		writeFileSync(schemaDslIndexPath, indexContent);
	}
};

/**
 * Fix all @Morph/ references in generated TypeScript files.
 */
const fixImports = (): void => {
	console.info("Fixing imports in TypeScript files...");

	const packageDirectories = getGeneratedPackageDirectories();
	const directories = packageDirectories.map((dir) => `${dir}/src`);

	for (const dir of directories) {
		const fullDir = path.join(MORPH_DIR, dir);
		if (!existsSync(fullDir)) continue;

		const fixFilesInDir = (dirPath: string): void => {
			const entries = readdirSync(dirPath, { withFileTypes: true });
			for (const entry of entries) {
				const entryPath = path.join(dirPath, entry.name);
				if (entry.isDirectory()) {
					fixFilesInDir(entryPath);
				} else if (entry.name.endsWith(".ts")) {
					let content = readFileSync(entryPath, "utf8");
					let changed = false;
					if (content.includes("@Morph/")) {
						content = content.replaceAll("@Morph/", "@morph/");
						changed = true;
					}
					// Fix schema import path for morph (uses schema-resolved.json with $ref resolved)
					// contexts packages use ../../../../schema.json (4 levels), apps/tests use ../../../ (3 levels)
					if (content.includes("../../../../schema.json")) {
						content = content.replaceAll(
							"../../../../schema.json",
							"../../../../schema-resolved.json",
						);
						changed = true;
					}
					if (content.includes("../../../schema.json")) {
						content = content.replaceAll(
							"../../../schema.json",
							"../../../schema-resolved.json",
						);
						changed = true;
					}
					if (changed) {
						writeFileSync(entryPath, content);
					}
				}
			}
		};

		fixFilesInDir(fullDir);
	}
};

/**
 * Sort imports in all generated TypeScript files.
 * This is a post-processing step that ensures all generated files have
 * correctly sorted imports matching perfectionist/sort-imports rules,
 * regardless of which generator produced them.
 */
const sortAllGeneratedImports = (): void => {
	console.info("Sorting imports in generated files...");

	const packageDirectories = getGeneratedPackageDirectories();
	let count = 0;

	const processDir = (dirPath: string): void => {
		if (!existsSync(dirPath)) return;
		const entries = readdirSync(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				processDir(fullPath);
			} else if (entry.name.endsWith(".ts")) {
				const content = readFileSync(fullPath, "utf8");
				const sorted = sortFileImports(content);
				if (sorted !== content) {
					writeFileSync(fullPath, sorted);
					count++;
				}
			}
		}
	};

	for (const dir of packageDirectories) {
		processDir(path.join(MORPH_DIR, dir, "src"));
	}

	// Also process contract tests
	processDir(path.join(MORPH_DIR, "tests/contracts/src"));

	console.info(`  Sorted imports in ${count} file(s)`);
};

/**
 * Main entry point.
 */
const main = async (): Promise<void> => {
	console.info("Regenerating morph from its schema...\n");

	// 1. Compile schema.morph → DomainSchema + schema-resolved.json
	const schema = compileMorphSchema();
	if (!schema) {
		process.exit(1);
	}

	// 1b. Compile extension schema.morph → schema.json
	compileExtensionSchemas();

	// 2. Run morph generate
	if (!(await runGenerate(schema))) {
		process.exit(1);
	}

	// 2b. Generate contract tests from extension schemas
	generateContracts(schema);

	// 2c. Copy scenario fixtures over generated scaffold
	copyScenariosFixtures();

	// 3. Fix package.json files
	fixPackageJsonFiles();

	// 4. Fix tsconfig.json files
	fixTsconfigFiles();

	// 4b. Fix VSCode app
	await fixVsCodeApp();

	// 5. Fix eslint.config.ts files
	fixEslintConfigFiles();

	// 6. Write impl and handler re-exports
	writeImplsAndHandlers();

	// 7. Fix layers.ts to use real implementations
	fixLayersFiles();

	// 8. Add core dependencies
	addCoreDependencies();

	// 9. Add DSL validation exports
	addDslFixtureExports();

	// 10. Write prose re-exports in core
	writeProseReexports();

	// 11. Add core fixture exports
	addCoreFixtureExports();

	// 12. Fix all imports
	fixImports();

	// 13. Sort imports in all generated files
	sortAllGeneratedImports();

	// 14. Run bun install
	console.info("\nInstalling dependencies...");
	const installResult = Bun.spawnSync(["bun", "install"], {
		cwd: ROOT_DIR,
		stderr: "inherit",
		stdout: "inherit",
	});

	if (installResult.exitCode !== 0) {
		console.error("Failed to install dependencies");
		process.exit(1);
	}

	// 15. Run format:fix on @morph packages
	// Prettier handles formatting consistently; skip lint:fix to avoid
	// issues with non-auto-fixable errors causing inconsistent behavior
	console.info("\nRunning format:fix...");
	const formatResult = Bun.spawnSync(
		["bun", "run", "format:fix", "--filter=@morph/*", "--force"],
		{
			cwd: ROOT_DIR,
			stderr: "inherit",
			stdout: "inherit",
		},
	);

	if (formatResult.exitCode !== 0) {
		console.error("Failed to run format:fix");
		process.exit(1);
	}

	console.info("\nMorph regenerated successfully!");
};

try {
	await main();
} catch (error) {
	console.error("Regeneration failed:", error);
	process.exit(1);
}
