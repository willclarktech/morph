#!/usr/bin/env bun
/**
 * Configure npm trusted publishing (OIDC) for all @morphdsl/* packages.
 *
 * Run locally after first token-based publish. Requires npm >= 11.10.0 and
 * an authenticated npm session with 2FA.
 *
 * Usage:
 *   bun scripts/setup-npm-trust.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.join(import.meta.dir, "..");
const REPO = "willclarktech/morph";
const WORKFLOW = "release.yml";

const findPublishablePackages = (dir: string): string[] => {
	const names: string[] = [];
	const SKIP = new Set([
		"node_modules",
		".git",
		".worktrees",
		"examples",
		"fixtures",
	]);
	const walk = (current: string): void => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (SKIP.has(entry.name)) continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name === "package.json") {
				try {
					const pkg = JSON.parse(readFileSync(full, "utf8")) as {
						name?: string;
						private?: boolean;
					};
					if (pkg.name?.startsWith("@morphdsl/") && !pkg.private) {
						names.push(pkg.name);
					}
				} catch {
					// ignore
				}
			}
		}
	};
	walk(dir);
	return [...new Set(names)].sort();
};

const main = async (): Promise<void> => {
	const packages = findPublishablePackages(ROOT_DIR);
	console.info(
		`Configuring trusted publishing for ${packages.length} packages...\n`,
	);

	let succeeded = 0;
	let skipped = 0;
	let failed = 0;
	const failures: string[] = [];

	for (const [index, name] of packages.entries()) {
		process.stdout.write(`[${index + 1}/${packages.length}] ${name} ... `);
		const result = Bun.spawnSync(
			[
				"npm",
				"trust",
				"github",
				"--file",
				WORKFLOW,
				"--repo",
				REPO,
				"--yes",
				name,
			],
			{ stderr: "pipe", stdout: "pipe" },
		);
		const stdout = new TextDecoder().decode(result.stdout);
		const stderr = new TextDecoder().decode(result.stderr);
		if (result.exitCode === 0) {
			console.info("ok");
			succeeded++;
		} else if (
			stderr.includes("already exists") ||
			stdout.includes("already exists")
		) {
			console.info("already configured");
			skipped++;
		} else {
			console.info("FAILED");
			console.error(stderr || stdout);
			failures.push(name);
			failed++;
		}
	}

	console.info(
		`\nDone. ${succeeded} configured, ${skipped} already set, ${failed} failed.`,
	);
	if (failures.length > 0) {
		console.error("Failed packages:", failures.join(", "));
		process.exit(1);
	}
};

await main();
