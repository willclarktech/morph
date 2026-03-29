#!/usr/bin/env bun
/**
 * Regenerate example projects from their schemas.
 *
 * Usage:
 *   bun scripts/generate-examples.ts           # Regenerate all examples
 *   bun scripts/generate-examples.ts todo-app  # Regenerate specific example
 *
 * This script:
 * 1. Deletes the existing example directory (clean slate)
 * 2. Runs `morph new-project` to generate the full project
 * 3. Copies fixture files:
 *    - impls/ -> operation impl files
 *    - dsl/   -> DSL fixtures (prose.ts, etc.)
 *    - scenarios/ -> Scenarios fixtures (scenarios.ts, etc.)
 *
 * Fixtures are stored in: examples/fixtures/{name}/
 *   - schema.morph - domain schema in .morph DSL format
 *   - impls/  - operation implementation files
 *   - dsl/    - DSL fixtures (prose.ts)
 *   - scenarios/ - Scenarios test fixtures (scenarios.ts)
 */
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

import { sortFileImports } from "../contexts/generation/utils/src/imports";
import { compile } from "../contexts/schema-dsl/compiler/src/index";
import { parse } from "../contexts/schema-dsl/parser/src/index";

const ROOT_DIR = path.join(import.meta.dir, "..");
const EXAMPLES_DIR = path.join(ROOT_DIR, "examples");
const FIXTURES_DIR = path.join(EXAMPLES_DIR, "fixtures");
const MORPH_CLI = path.join(ROOT_DIR, "apps/cli/src/index.ts");

const findSchemaFile = (name: string): string | undefined => {
	const morphFile = path.join(FIXTURES_DIR, name, "schema.morph");
	if (existsSync(morphFile)) return morphFile;
	return undefined;
};

/**
 * Auto-detect examples by scanning fixtures directory for directories with schema.morph.
 */
const discoverExamples = (): readonly string[] => {
	const entries = readdirSync(FIXTURES_DIR, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.filter((entry) => findSchemaFile(entry.name) !== undefined)
		.map((entry) => entry.name);
};

const EXAMPLES = discoverExamples();

/**
 * Find all core package directories, keyed by context name.
 */
const findAllCorePackageDirectories = (
	name: string,
): Record<string, string> => {
	const contextsDir = path.join(EXAMPLES_DIR, name, "contexts");
	if (!existsSync(contextsDir)) {
		return {};
	}
	const result: Record<string, string> = {};
	const contexts = readdirSync(contextsDir, { withFileTypes: true });
	for (const context of contexts) {
		if (context.isDirectory()) {
			const coreDir = path.join(contextsDir, context.name, "core");
			if (existsSync(coreDir)) {
				result[context.name] = coreDir;
			}
		}
	}
	return result;
};

/**
 * Find the primary core package directory (first context with a core/ subdir).
 */
const _findCorePackageDir = (name: string): string | undefined => {
	const all = findAllCorePackageDirectories(name);
	return Object.values(all)[0];
};

/**
 * Find all DSL package directories, keyed by context name.
 */
const findAllDslPackageDirectories = (name: string): Record<string, string> => {
	const contextsDir = path.join(EXAMPLES_DIR, name, "contexts");
	if (!existsSync(contextsDir)) {
		return {};
	}
	const result: Record<string, string> = {};
	const contexts = readdirSync(contextsDir, { withFileTypes: true });
	for (const context of contexts) {
		if (context.isDirectory()) {
			const dslDir = path.join(contextsDir, context.name, "dsl");
			if (existsSync(dslDir)) {
				result[context.name] = dslDir;
			}
		}
	}
	return result;
};

/**
 * Find the primary DSL package directory (first context with a dsl/ subdir).
 */
const _findDslPackageDir = (name: string): string | undefined => {
	const all = findAllDslPackageDirectories(name);
	return Object.values(all)[0];
};

/**
 * Copy fixture impl files to the generated project.
 * Fixtures in impls/ are named like: complete-todo.ts -> operations/complete-todo/impl.ts
 * For multi-context examples, finds the correct core package by checking which one
 * has a matching operations/ directory.
 */
const copyImplFixtures = (name: string): number => {
	const implsDir = path.join(FIXTURES_DIR, name, "impls");
	if (!existsSync(implsDir)) {
		return 0;
	}

	const allCoreDirectories = findAllCorePackageDirectories(name);
	const coreDirList = Object.values(allCoreDirectories);
	if (coreDirList.length === 0) {
		console.warn(`  Warning: No core package found for ${name}`);
		return 0;
	}

	const files = readdirSync(implsDir).filter((f) => f.endsWith(".ts"));

	for (const file of files) {
		const opName = file.replace(".ts", "");
		const source = path.join(implsDir, file);
		// Find which core package has this operation
		const targetCore =
			coreDirList.find((coreDir) =>
				existsSync(path.join(coreDir, "src/operations", opName)),
			) ?? coreDirList[0];
		const target = path.join(targetCore, "src/operations", opName, "impl.ts");
		Bun.spawnSync(["cp", source, target]);
	}

	return files.length;
};

/**
 * Copy subscriber fixture files to the generated project.
 * Fixtures in subscribers/ are named like: log-todo-events.ts -> subscribers/log-todo-events/impl.ts
 * For multi-context examples, finds the correct core package by checking which one
 * has a matching subscribers/ directory.
 */
const copySubscriberFixtures = (name: string): number => {
	const subscribersDir = path.join(FIXTURES_DIR, name, "subscribers");
	if (!existsSync(subscribersDir)) {
		return 0;
	}

	const allCoreDirectories = findAllCorePackageDirectories(name);
	const coreDirList = Object.values(allCoreDirectories);
	if (coreDirList.length === 0) {
		console.warn(`  Warning: No core package found for ${name}`);
		return 0;
	}

	const files = readdirSync(subscribersDir).filter((f) => f.endsWith(".ts"));

	for (const file of files) {
		const subscriberName = file.replace(".ts", "");
		const source = path.join(subscribersDir, file);
		// Find which core package has this subscriber
		const targetCore =
			coreDirList.find((coreDir) =>
				existsSync(path.join(coreDir, "src/subscribers", subscriberName)),
			) ?? coreDirList[0];
		const target = path.join(
			targetCore,
			"src/subscribers",
			subscriberName,
			"impl.ts",
		);
		Bun.spawnSync(["cp", source, target]);
	}

	return files.length;
};

/**
 * Copy scenarios fixtures (scenarios.ts, etc.) to the generated scenarios package.
 */
const copyScenariosFixtures = (name: string): number => {
	const scenariosFixturesDir = path.join(FIXTURES_DIR, name, "scenarios");
	if (!existsSync(scenariosFixturesDir)) {
		return 0;
	}

	const files = readdirSync(scenariosFixturesDir).filter((f) =>
		f.endsWith(".ts"),
	);
	const targetDir = path.join(EXAMPLES_DIR, name, `tests/scenarios/src`);

	for (const file of files) {
		const source = path.join(scenariosFixturesDir, file);
		const target = path.join(targetDir, file);
		Bun.spawnSync(["cp", source, target]);
	}

	return files.length;
};

/**
 * Wire prose from a DSL package into its corresponding core package.
 * Updates DSL index.ts to export prose, creates re-export in core, updates core index.ts.
 */
const wireProseForContext = (dslDir: string, coreDir: string): void => {
	// Update DSL index to export prose
	const dslIndexPath = path.join(dslDir, "src/index.ts");
	if (existsSync(dslIndexPath)) {
		const content = readFileSync(dslIndexPath, "utf8");
		if (!content.includes("prose")) {
			const updatedContent =
				content.trimEnd() +
				'\n\n// Prose (hand-written fixture)\nexport { prose } from "./prose";\n';
			writeFileSync(dslIndexPath, updatedContent);
		}
	}

	// Create re-export in core
	const dslPackageJsonPath = path.join(dslDir, "package.json");
	if (!existsSync(dslPackageJsonPath)) return;

	const dslPackageJson = JSON.parse(
		readFileSync(dslPackageJsonPath, "utf8"),
	) as { name: string };
	const dslPackageName = dslPackageJson.name;

	const coreProseFile = path.join(coreDir, "src/prose.ts");
	writeFileSync(
		coreProseFile,
		`// Re-export prose from DSL\n// For examples, prose lives in DSL; for morph, it lives in impls\n\nexport { prose } from "${dslPackageName}";\n`,
	);

	// Update core index.ts to export prose
	const coreIndexPath = path.join(coreDir, "src/index.ts");
	if (existsSync(coreIndexPath)) {
		const coreContent = readFileSync(coreIndexPath, "utf8");
		if (!coreContent.includes("prose")) {
			const updatedCoreContent =
				coreContent.trimEnd() +
				'\n\n// Prose (re-exported from DSL)\nexport * from "./prose";\n';
			writeFileSync(coreIndexPath, updatedCoreContent);
		}
	}
};

/**
 * Copy DSL fixtures (prose.ts, etc.) to the generated DSL packages.
 * Supports two layouts:
 *   - dsl/prose.ts          -> copied to the primary (first) context's DSL package
 *   - dsl/{contextName}/prose.ts -> copied to the named context's DSL package
 * Also updates DSL index.ts and core re-exports for each context that gets prose.
 */
const copyDslFixtures = (name: string): number => {
	const dslFixturesDir = path.join(FIXTURES_DIR, name, "dsl");
	if (!existsSync(dslFixturesDir)) {
		return 0;
	}

	const allDslDirectories = findAllDslPackageDirectories(name);
	const allCoreDirectories = findAllCorePackageDirectories(name);
	let count = 0;

	// Copy top-level .ts files to the primary (first) DSL package
	const topLevelFiles = readdirSync(dslFixturesDir).filter(
		(f) =>
			f.endsWith(".ts") &&
			!readdirSync(dslFixturesDir, { withFileTypes: true }).some(
				(entry) => entry.name === f && entry.isDirectory(),
			),
	);
	const primaryDslDir = Object.values(allDslDirectories)[0];
	const primaryContextName = Object.keys(allDslDirectories)[0];

	if (topLevelFiles.length > 0 && primaryDslDir) {
		const targetDir = path.join(primaryDslDir, "src");
		for (const file of topLevelFiles) {
			const source = path.join(dslFixturesDir, file);
			const target = path.join(targetDir, file);
			Bun.spawnSync(["cp", source, target]);
			count++;
		}
		if (topLevelFiles.includes("prose.ts") && primaryContextName) {
			const coreDir = allCoreDirectories[primaryContextName];
			if (coreDir) wireProseForContext(primaryDslDir, coreDir);
		}
	}

	// Copy per-context subdirectories: dsl/{contextName}/*.ts
	const entries = readdirSync(dslFixturesDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const contextName = entry.name;
		const dslDir = allDslDirectories[contextName];
		if (!dslDir) {
			console.warn(`  Warning: No DSL package for context ${contextName}`);
			continue;
		}
		const contextFixtureDir = path.join(dslFixturesDir, contextName);
		const files = readdirSync(contextFixtureDir).filter((f) =>
			f.endsWith(".ts"),
		);
		const targetDir = path.join(dslDir, "src");
		for (const file of files) {
			const source = path.join(contextFixtureDir, file);
			const target = path.join(targetDir, file);
			Bun.spawnSync(["cp", source, target]);
			count++;
		}
		if (files.includes("prose.ts")) {
			const coreDir = allCoreDirectories[contextName];
			if (coreDir) wireProseForContext(dslDir, coreDir);
		}
	}

	return count;
};

/**
 * Copy ui.config.ts to the project root if it exists in fixtures.
 */
const copyUiConfig = (name: string): boolean => {
	const source = path.join(FIXTURES_DIR, name, "ui.config.ts");
	if (!existsSync(source)) {
		return false;
	}

	const target = path.join(EXAMPLES_DIR, name, "ui.config.ts");
	Bun.spawnSync(["cp", source, target]);
	return true;
};

/**
 * Copy all fixtures for an example.
 */
const copyFixtures = (name: string): void => {
	const fixturesDir = path.join(FIXTURES_DIR, name);
	if (!existsSync(fixturesDir)) {
		console.info(`  No fixtures for ${name}`);
		return;
	}

	const implCount = copyImplFixtures(name);
	const subscriberCount = copySubscriberFixtures(name);
	const dslCount = copyDslFixtures(name);
	const scenariosCount = copyScenariosFixtures(name);
	const hasUiConfig = copyUiConfig(name);

	const configFiles = [hasUiConfig ? "ui.config.ts" : ""]
		.filter(Boolean)
		.join(", ");

	console.info(
		`  Copied ${implCount} impl, ${subscriberCount} subscriber, ${dslCount} DSL, ${scenariosCount} scenarios fixture(s)${configFiles ? `, ${configFiles}` : ""}`,
	);
};

const compileMorphToJson = (morphFile: string): string => {
	const source = readFileSync(morphFile, "utf8");
	const parseResult = parse(source);
	if (parseResult.errors.length > 0) {
		const msgs = parseResult.errors.map(
			(error) =>
				`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
		);
		throw new Error(`Parse errors in ${morphFile}:\n${msgs.join("\n")}`);
	}

	if (!parseResult.ast) throw new Error(`No AST produced for ${morphFile}`);
	const compileResult = compile(parseResult.ast);
	if (compileResult.errors.length > 0) {
		const msgs = compileResult.errors.map(
			(error) =>
				`  Line ${error.range.start.line}:${error.range.start.column}: ${error.message}`,
		);
		throw new Error(`Compile errors in ${morphFile}:\n${msgs.join("\n")}`);
	}

	const temporaryFile = morphFile.replace(/\.morph$/, ".schema-dsl-tmp.json");
	writeFileSync(
		temporaryFile,
		JSON.stringify(compileResult.schema, undefined, "\t"),
	);
	return temporaryFile;
};

const generateExample = (name: string): boolean => {
	const sourceSchemaFile = findSchemaFile(name);
	const uiConfigFile = path.join(FIXTURES_DIR, name, "ui.config.ts");
	const outputDir = path.join(EXAMPLES_DIR, name);

	if (!sourceSchemaFile) {
		console.error(`Schema not found for: ${name}`);
		return false;
	}

	let schemaFile = sourceSchemaFile;
	let temporaryJsonFile: string | undefined;
	if (sourceSchemaFile.endsWith(".morph")) {
		console.info(`  Compiling ${path.basename(sourceSchemaFile)} → JSON...`);
		temporaryJsonFile = compileMorphToJson(sourceSchemaFile);
		schemaFile = temporaryJsonFile;
	}

	console.info(`\nGenerating ${name}...`);

	// 1. Delete existing output directory
	if (existsSync(outputDir)) {
		console.info(`  Removing existing ${name}/`);
		rmSync(outputDir, { recursive: true });
	}

	// 2. Run morph new-project (with config files if they exist)
	const morphArguments = [
		"bun",
		MORPH_CLI,
		"generation:new-project",
		name,
		"--schema-file",
		schemaFile,
	];
	if (existsSync(uiConfigFile)) {
		morphArguments.push("--ui-config-file", uiConfigFile);
	}
	const result = Bun.spawnSync(morphArguments, {
		cwd: EXAMPLES_DIR,
		stderr: "inherit",
		stdout: "inherit",
	});

	if (result.exitCode !== 0) {
		console.error(`Failed to generate ${name}`);
		return false;
	}

	// 3. Copy fixture impl files
	copyFixtures(name);

	// 4. Remove turbo.json and update package.json to avoid conflicts with parent workspace
	// (Generator includes turbo.json for standalone projects, but examples are nested)
	const turboJsonPath = path.join(outputDir, "turbo.json");
	if (existsSync(turboJsonPath)) {
		rmSync(turboJsonPath);
	}

	// Update package.json to use bun workspace filter instead of turbo
	const packageJsonPath = path.join(outputDir, "package.json");
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
		devDependencies?: Record<string, string>;
		scripts?: Record<string, string>;
	};
	const scripts = packageJson.scripts ?? {};
	for (const [key, value] of Object.entries(scripts)) {
		if (value.startsWith("turbo run ")) {
			scripts[key] = value.replace("turbo run ", "bun run --filter '*' ");
		}
	}
	// Remove turbo devDependency
	if (packageJson.devDependencies?.turbo) {
		delete packageJson.devDependencies.turbo;
	}
	writeFileSync(
		packageJsonPath,
		JSON.stringify(packageJson, undefined, "\t") + "\n",
	);

	// Fix internal package references to use @morph scope
	fixInternalPackageReferences(outputDir);

	// Sort imports in all generated TypeScript files
	sortExampleImports(name);

	// Clean up temporary compiled JSON if we used a .morph source
	if (temporaryJsonFile && existsSync(temporaryJsonFile)) {
		rmSync(temporaryJsonFile);
	}

	return true;
};

/**
 * Fix internal package references in generated examples.
 * Internal packages (modules/) use @morphdsl/* scope.
 */
const fixInternalPackageReferences = (outputDir: string): void => {
	// Find all package.json files recursively
	const findPackageJsonFiles = (dir: string): string[] => {
		const results: string[] = [];
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory() && entry.name !== "node_modules") {
				results.push(...findPackageJsonFiles(fullPath));
			} else if (entry.name === "package.json") {
				results.push(fullPath);
			}
		}
		return results;
	};

	const packageJsonFiles = findPackageJsonFiles(outputDir);
	for (const packagePath of packageJsonFiles) {
		let content = readFileSync(packagePath, "utf8");

		// Fix internal package references
		content = content.replaceAll(
			'"@morphdsl/domain-schema": "workspace:*"',
			'"@morphdsl/domain-schema": "workspace:*"',
		);
		content = content.replaceAll(
			'"@morphdsl/runtime-cli": "workspace:*"',
			'"@morphdsl/runtime-cli": "workspace:*"',
		);
		content = content.replaceAll(
			'"@morphdsl/runtime-mcp": "workspace:*"',
			'"@morphdsl/runtime-mcp": "workspace:*"',
		);
		content = content.replaceAll(
			'"@morphdsl/runtime-api": "workspace:*"',
			'"@morphdsl/runtime-api": "workspace:*"',
		);
		content = content.replaceAll(
			'"@morphdsl/auth-password": "workspace:*"',
			'"@morphdsl/auth-password-impls": "workspace:*"',
		);

		writeFileSync(packagePath, content);
	}
};

/**
 * Sort imports in all generated TypeScript files for an example.
 */
const sortExampleImports = (name: string): void => {
	const exampleDir = path.join(EXAMPLES_DIR, name);
	let count = 0;

	const processDir = (dirPath: string): void => {
		if (!existsSync(dirPath)) return;
		const entries = readdirSync(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory() && entry.name !== "node_modules") {
				processDir(fullPath);
			} else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
				const content = readFileSync(fullPath, "utf8");
				const sorted = sortFileImports(content);
				if (sorted !== content) {
					writeFileSync(fullPath, sorted);
					count++;
				}
			}
		}
	};

	// Walk all src/ directories in the example
	const contextsDir = path.join(exampleDir, "contexts");
	if (existsSync(contextsDir)) {
		const contexts = readdirSync(contextsDir, { withFileTypes: true });
		for (const context of contexts) {
			if (!context.isDirectory()) continue;
			for (const sub of ["dsl", "core"]) {
				processDir(path.join(contextsDir, context.name, sub, "src"));
			}
		}
	}

	for (const sub of ["apps", "libs", "tests"]) {
		const subDir = path.join(exampleDir, sub);
		if (existsSync(subDir)) processDir(subDir);
	}

	if (count > 0) console.info(`  Sorted imports in ${count} file(s)`);
};

const main = (): void => {
	const arguments_ = process.argv.slice(2);
	const targetExample = arguments_[0];

	const examplesToGenerate = targetExample
		? EXAMPLES.filter((name) => name === targetExample)
		: EXAMPLES;

	if (targetExample && examplesToGenerate.length === 0) {
		console.error(`Unknown example: ${targetExample}`);
		console.error(`Available examples: ${EXAMPLES.join(", ")}`);
		process.exit(1);
	}

	console.info(
		`Regenerating ${examplesToGenerate.length} example(s): ${examplesToGenerate.join(", ")}`,
	);

	let failed = false;
	for (const example of examplesToGenerate) {
		if (!generateExample(example)) {
			failed = true;
		}
	}

	if (failed) {
		console.error("\nSome examples failed to generate");
		process.exit(1);
	}

	// Install dependencies once after all examples are generated
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

	// Run format:fix on generated examples
	// Prettier handles formatting consistently; skip lint:fix to avoid
	// issues with non-auto-fixable errors causing inconsistent behavior
	console.info("\nRunning format:fix...");

	// Build filters for each example's packages
	const filters = examplesToGenerate.flatMap((name) => [
		"--filter",
		`@${name}/*`,
	]);

	const formatResult = Bun.spawnSync(
		["bun", "run", "format:fix", ...filters, "--force"],
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

	console.info("\nAll examples generated successfully!");
};

main();
