#!/usr/bin/env bun
/**
 * Rewrite `workspace:*` dependencies to actual versions in all @morphdsl/* packages.
 *
 * `npm publish` (which `bunx changeset publish` calls) doesn't understand the
 * workspace protocol, so published packages end up with `workspace:*` literally
 * in their deps and fail to install for downstream consumers.
 *
 * This script reads the current version of each workspace package and rewrites
 * matching `workspace:*` references in dependents' package.json files.
 *
 * Run after `changeset version` and before `changeset publish`. The rewrites
 * are intended to live only on the CI runner (the workspace-protocol form is
 * what we want in committed source for local development).
 *
 * Usage: bun scripts/rewrite-workspace-deps.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..");
const SKIP = new Set([".git", ".worktrees", "examples", "node_modules"]);

interface PackageInfo {
	readonly name: string;
	readonly version: string;
	readonly path: string;
}

const findPackages = (dir: string): PackageInfo[] => {
	const out: PackageInfo[] = [];
	const walk = (current: string): void => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (SKIP.has(entry.name)) continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name === "package.json") {
				try {
					const package_ = JSON.parse(readFileSync(full, "utf8")) as {
						name?: string;
						version?: string;
					};
					if (package_.name && package_.version) {
						out.push({
							name: package_.name,
							version: package_.version,
							path: full,
						});
					}
				} catch {
					// ignore unparseable
				}
			}
		}
	};
	walk(dir);
	return out;
};

const rewriteDeps = (
	deps: Record<string, string> | undefined,
	versionByName: Map<string, string>,
): { changed: boolean; deps: Record<string, string> | undefined } => {
	if (!deps) return { changed: false, deps };
	let changed = false;
	const next: Record<string, string> = { ...deps };
	for (const [name, range] of Object.entries(next)) {
		if (range === "workspace:*" || range.startsWith("workspace:")) {
			const target = versionByName.get(name);
			if (target) {
				next[name] = target;
				changed = true;
			}
		}
	}
	return { changed, deps: next };
};

const packages = findPackages(ROOT);
const versionByName = new Map(packages.map((p) => [p.name, p.version]));

console.info(`Scanning ${packages.length} packages for workspace deps...`);
let updated = 0;

for (const package_ of packages) {
	const raw = readFileSync(package_.path, "utf8");
	const parsed = JSON.parse(raw) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};

	const deps = rewriteDeps(parsed.dependencies, versionByName);
	const devDeps = rewriteDeps(parsed.devDependencies, versionByName);
	const peerDeps = rewriteDeps(parsed.peerDependencies, versionByName);

	if (!deps.changed && !devDeps.changed && !peerDeps.changed) continue;

	if (deps.changed) parsed.dependencies = deps.deps;
	if (devDeps.changed) parsed.devDependencies = devDeps.deps;
	if (peerDeps.changed) parsed.peerDependencies = peerDeps.deps;

	writeFileSync(package_.path, JSON.stringify(parsed, undefined, "\t") + "\n");
	updated++;
	console.info(`  Rewrote: ${path.relative(ROOT, package_.path)}`);
}

console.info(`\nDone. ${updated} package.json file(s) updated.`);
