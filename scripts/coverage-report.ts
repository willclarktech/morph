#!/usr/bin/env bun
/**
 * Aggregate lcov coverage reports from all packages and print a summary table.
 *
 * Usage:
 *   bun scripts/coverage-report.ts
 *
 * Finds all coverage/lcov.info files, parses line coverage, and prints
 * a grouped summary (morph generation, morph apps, examples).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface PackageCoverage {
	readonly name: string;
	readonly group: "generation" | "apps" | "examples" | "other";
	readonly linesHit: number;
	readonly linesTotal: number;
}

const ROOT = path.resolve(import.meta.dir, "..");

const findLcovFiles = (dir: string): readonly string[] => {
	const results: string[] = [];
	const walk = (current: string): void => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.name === "node_modules") continue;
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.name === "lcov.info" && current.endsWith("/coverage")) {
				results.push(full);
			}
		}
	};
	walk(dir);
	return results;
};

const classifyPackage = (
	lcovPath: string,
): "generation" | "apps" | "examples" | "other" => {
	const relative = path.relative(ROOT, lcovPath);
	if (relative.startsWith("contexts/generation/")) return "generation";
	if (relative.startsWith("contexts/schema-dsl/")) return "generation";
	if (relative.startsWith("apps/")) return "apps";
	if (relative.startsWith("examples/")) return "examples";
	return "other";
};

const getPackageName = (lcovPath: string): string => {
	const packageDir = path.dirname(path.dirname(lcovPath));
	const packageJsonPath = path.join(packageDir, "package.json");
	try {
		const package_ = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
			name?: string;
		};
		return package_.name ?? path.relative(ROOT, packageDir);
	} catch {
		return path.relative(ROOT, packageDir);
	}
};

const parseLcov = (
	content: string,
): { linesHit: number; linesTotal: number } => {
	let linesHit = 0;
	let linesTotal = 0;
	for (const line of content.split("\n")) {
		if (line.startsWith("LH:")) {
			linesHit += Number.parseInt(line.slice(3), 10);
		} else if (line.startsWith("LF:")) {
			linesTotal += Number.parseInt(line.slice(3), 10);
		}
	}
	return { linesHit, linesTotal };
};

const pct = (hit: number, total: number): string =>
	total === 0 ? "n/a" : `${((hit / total) * 100).toFixed(1)}%`;

const pad = (
	s: string,
	width: number,
	align: "left" | "right" = "left",
): string => (align === "right" ? s.padStart(width) : s.padEnd(width));

const run = async (): Promise<void> => {
	const lcovFiles = findLcovFiles(ROOT);

	if (lcovFiles.length === 0) {
		console.warn("No coverage data found. Run `bun run test:coverage` first.");
		process.exit(1);
	}

	const packages: PackageCoverage[] = [];

	for (const lcovPath of lcovFiles) {
		const content = await Bun.file(lcovPath).text();
		const { linesHit, linesTotal } = parseLcov(content);
		packages.push({
			name: getPackageName(lcovPath),
			group: classifyPackage(lcovPath),
			linesHit,
			linesTotal,
		});
	}

	packages.sort((a, b) => a.name.localeCompare(b.name));

	const groups = [
		{ key: "generation" as const, label: "Morph Generation" },
		{ key: "apps" as const, label: "Morph Apps" },
		{ key: "examples" as const, label: "Examples" },
		{ key: "other" as const, label: "Other" },
	];

	const nameWidth = Math.max(
		"Package".length,
		...packages.map((p) => p.name.length),
	);
	const separator = "-".repeat(nameWidth + 32);

	console.info();
	console.info(
		`${pad("Package", nameWidth)}  ${"Hit".padStart(6)}  ${"Total".padStart(6)}  ${"Line %".padStart(7)}`,
	);
	console.info(separator);

	let totalHit = 0;
	let totalTotal = 0;

	for (const group of groups) {
		const pkgs = packages.filter((p) => p.group === group.key);
		if (pkgs.length === 0) continue;

		console.info(`\n  ${group.label}`);

		for (const package_ of pkgs) {
			totalHit += package_.linesHit;
			totalTotal += package_.linesTotal;
			console.info(
				`${pad(package_.name, nameWidth)}  ${pad(String(package_.linesHit), 6, "right")}  ${pad(String(package_.linesTotal), 6, "right")}  ${pad(pct(package_.linesHit, package_.linesTotal), 7, "right")}`,
			);
		}
	}

	console.info(separator);
	console.info(
		`${pad("TOTAL", nameWidth)}  ${pad(String(totalHit), 6, "right")}  ${pad(String(totalTotal), 6, "right")}  ${pad(pct(totalHit, totalTotal), 7, "right")}`,
	);
	console.info();
};

await run();
