#!/usr/bin/env bun
/**
 * Bulk-update hand-written @morphdsl/* packages for npm publishing.
 *
 * - Removes `private: true` from publishable packages
 * - Adds license, description, repository, author fields
 * - Reorders keys in human-friendly order
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.join(import.meta.dir, "..");
const REPO_URL = "git+https://github.com/willclarktech/morph.git";

const KEEP_PRIVATE = new Set([
	"@morphdsl/codemirror-lang-morph",
	"@morphdsl/site",
]);

// Packages in these directories are always private (not published to npm)
const PRIVATE_DIRS = new Set(["examples", "fixtures", "tests"]);

// Packages that get special handling (no standard build script)
const NO_BUILD_PACKAGES = new Set([
	"@morphdsl/eslint-config",
	"@morphdsl/tsconfig",
]);

const BUILD_SCRIPT =
	"bun build ./src/index.ts --outdir dist --target node --format esm --packages external && tsc -p tsconfig.build.json";

const PACKAGE_KEY_ORDER = [
	"$schema",
	"name",
	"version",
	"private",
	"description",
	"license",
	"author",
	"repository",
	"type",
	"main",
	"exports",
	"files",
	"bin",
	"publishConfig",
	"scripts",
	"dependencies",
	"devDependencies",
	"packageManager",
	"workspaces",
];

const sortObjectKeys = <T extends Record<string, unknown>>(input: T): T => {
	if (Array.isArray(input)) return input as T;
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

const orderedPackageJson = (
	input: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const key of PACKAGE_KEY_ORDER) {
		if (key in input) {
			const value = input[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	for (const key of Object.keys(input).sort()) {
		if (!(key in result)) {
			const value = input[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	return result;
};

const descriptionForPackage = (name: string): string => {
	const suffix = name.replace("@morphdsl/", "");

	if (suffix.startsWith("runtime-"))
		return `Morph ${suffix.replace("runtime-", "")} runtime`;
	if (suffix.startsWith("builder-"))
		return `Morph ${suffix.replace("builder-", "")} builder`;
	if (suffix.startsWith("generator-"))
		return `Morph ${suffix.replace("generator-", "")} generator`;
	if (suffix.startsWith("plugin-"))
		return `Morph ${suffix.replace("plugin-", "")} plugin`;
	if (suffix.startsWith("scenario-runner-"))
		return `Morph ${suffix.replace("scenario-runner-", "")} scenario runner`;
	if (suffix.startsWith("property-runner-"))
		return `Morph ${suffix.replace("property-runner-", "")} property runner`;
	if (suffix.startsWith("schema-dsl-"))
		return `Morph schema DSL ${suffix.replace("schema-dsl-", "")}`;
	if (suffix.startsWith("storage-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("auth-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("codec-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("eventstore-")) return `Morph ${suffix} extension`;

	const known: Record<string, string> = {
		"domain-schema": "Morph domain schema types and utilities",
		"generation-impls": "Morph generation implementations",
		"http-client": "Morph HTTP client utilities",
		operation: "Morph operation abstractions",
		plugin: "Morph generator plugin interface",
		testing: "Morph testing utilities",
		scenario: "Morph scenario definitions",
		property: "Morph property-based test definitions",
		"property-runner": "Morph property-based test runner",
		utils: "Morph shared utilities",
	};
	return known[suffix] ?? `Morph ${suffix}`;
};

const findPackageJsonFiles = (dir: string): string[] => {
	const results: string[] = [];
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name === ".git") continue;
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findPackageJsonFiles(fullPath));
		} else if (entry.name === "package.json") {
			results.push(fullPath);
		}
	}
	return results;
};

const main = (): void => {
	const packageFiles = findPackageJsonFiles(ROOT_DIR);
	let updated = 0;

	for (const filePath of packageFiles) {
		const raw = readFileSync(filePath, "utf8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const name = parsed.name as string | undefined;
		if (!name?.startsWith("@morphdsl/")) continue;

		const relativePath = path.relative(ROOT_DIR, path.dirname(filePath));

		const topDir = relativePath.split("/")[0] ?? "";
		if (PRIVATE_DIRS.has(topDir)) continue;

		const shouldKeepPrivate = KEEP_PRIVATE.has(name);
		const isPublishable = !shouldKeepPrivate;

		parsed.description ??= descriptionForPackage(name);
		parsed.license ??= "MIT";
		parsed.author ??= "Morph Contributors";
		parsed.repository = {
			type: "git",
			url: REPO_URL,
			directory: relativePath,
		};

		if (isPublishable) {
			delete parsed.private;
		} else {
			parsed.private = true;
		}

		if (isPublishable && !NO_BUILD_PACKAGES.has(name)) {
			const scripts = (parsed.scripts ?? {}) as Record<string, unknown>;
			if (!("build" in scripts)) {
				scripts.build = BUILD_SCRIPT;
			}
			parsed.scripts = scripts;

			if (!("files" in parsed)) {
				parsed.files = ["dist"];
			}
			if (!("publishConfig" in parsed)) {
				parsed.publishConfig = {
					exports: {
						".": {
							types: "./dist/index.d.ts",
							import: "./dist/index.js",
						},
					},
				};
			}

			const tsconfigBuildPath = path.join(
				path.dirname(filePath),
				"tsconfig.build.json",
			);
			const relativeConfigPath = path.relative(
				path.dirname(filePath),
				path.join(ROOT_DIR, "config/tsconfig/build.json"),
			);
			const tsconfigBuild = `{
	"extends": "${relativeConfigPath}",
	"compilerOptions": {
		"rootDir": "src",
		"outDir": "dist"
	},
	"include": ["src"],
	"exclude": ["src/**/*.test.ts"]
}
`;
			const existingTsconfigBuild = (() => {
				try {
					return readFileSync(tsconfigBuildPath, "utf8");
				} catch {
					return undefined;
				}
			})();
			if (existingTsconfigBuild !== tsconfigBuild) {
				writeFileSync(tsconfigBuildPath, tsconfigBuild);
				console.info(`  Wrote: ${relativePath}/tsconfig.build.json`);
			}
		}

		const ordered = orderedPackageJson(parsed);
		const newContent = JSON.stringify(ordered, undefined, "\t") + "\n";

		if (newContent !== raw) {
			writeFileSync(filePath, newContent);
			updated++;
			console.info(`  Updated: ${relativePath}/package.json (${name})`);
		}
	}

	console.info(`\nUpdated ${updated} package(s)`);
};

main();
