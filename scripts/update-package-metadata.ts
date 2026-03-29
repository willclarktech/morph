#!/usr/bin/env bun
/**
 * Bulk-update hand-written @morphdsl/* packages for npm publishing.
 *
 * - Removes `private: true` from publishable packages
 * - Adds license, description, repository, author fields
 * - Reorders keys in human-friendly order
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.join(import.meta.dir, "..");
const REPO_URL = "https://github.com/morphdsl/morph";

const KEEP_PRIVATE = new Set(["@morphdsl/eslint-config", "@morphdsl/tsconfig"]);

// Packages in these directories are always private
const PRIVATE_DIRS = new Set(["examples", "tests", "fixtures"]);

const PACKAGE_KEY_ORDER = [
	"$schema",
	"name",
	"version",
	"description",
	"license",
	"author",
	"repository",
	"type",
	"main",
	"exports",
	"bin",
	"scripts",
	"dependencies",
	"devDependencies",
	"private",
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
	obj: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const key of PACKAGE_KEY_ORDER) {
		if (key in obj) {
			const value = obj[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	for (const key of Object.keys(obj).sort()) {
		if (!(key in result)) {
			const value = obj[key];
			result[key] =
				typeof value === "object" && value !== null && !Array.isArray(value)
					? sortObjectKeys(value as Record<string, unknown>)
					: value;
		}
	}
	return result;
};

const descriptionForPackage = (name: string): string => {
	// Extract the meaningful part after @morphdsl/
	const suffix = name.replace("@morphdsl/", "");

	// Runtime packages
	if (suffix.startsWith("runtime-"))
		return `Morph ${suffix.replace("runtime-", "")} runtime`;
	// Builders
	if (suffix.startsWith("builder-"))
		return `Morph ${suffix.replace("builder-", "")} builder`;
	// Generators
	if (suffix.startsWith("generator-"))
		return `Morph ${suffix.replace("generator-", "")} generator`;
	// Plugins
	if (suffix.startsWith("plugin-"))
		return `Morph ${suffix.replace("plugin-", "")} plugin`;
	// Scenario runners
	if (suffix.startsWith("scenario-runner-"))
		return `Morph ${suffix.replace("scenario-runner-", "")} scenario runner`;
	// Property runners
	if (suffix.startsWith("property-runner-"))
		return `Morph ${suffix.replace("property-runner-", "")} property runner`;
	// Schema DSL
	if (suffix.startsWith("schema-dsl-"))
		return `Morph schema DSL ${suffix.replace("schema-dsl-", "")}`;
	// Extensions
	if (suffix.startsWith("storage-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("auth-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("codec-")) return `Morph ${suffix} extension`;
	if (suffix.startsWith("eventstore-")) return `Morph ${suffix} extension`;

	// Known packages
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
		const pkg = JSON.parse(raw) as Record<string, unknown>;
		const name = pkg["name"] as string | undefined;
		if (!name || !name.startsWith("@morphdsl/")) continue;

		const relativePath = path.relative(ROOT_DIR, path.dirname(filePath));

		// Skip private directories
		const topDir = relativePath.split("/")[0] ?? "";
		if (PRIVATE_DIRS.has(topDir)) continue;

		const shouldKeepPrivate = KEEP_PRIVATE.has(name);

		// Add metadata
		if (!pkg["description"]) {
			pkg["description"] = descriptionForPackage(name);
		}
		if (!pkg["license"]) {
			pkg["license"] = "MIT";
		}
		if (!pkg["author"]) {
			pkg["author"] = "Morph Contributors";
		}
		if (!pkg["repository"]) {
			pkg["repository"] = {
				type: "git",
				url: REPO_URL,
				directory: relativePath,
			};
		}

		// Remove private unless it should stay private
		if (!shouldKeepPrivate) {
			delete pkg["private"];
		}

		const ordered = orderedPackageJson(pkg);
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
