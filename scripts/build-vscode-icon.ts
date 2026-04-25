#!/usr/bin/env bun
/**
 * Re-derive apps/vscode/icon.png from docs/images/logo.png at 128x128.
 *
 * Source logo is already cropped square; this just resizes.
 * Run via `bun scripts/build-vscode-icon.ts` or as part of `bun run package`
 * in apps/vscode.
 */
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..");
const SOURCE = path.join(ROOT, "docs/images/logo.png");
const TARGET = path.join(ROOT, "apps/vscode/icon.png");
const SIZE = 128;

if (!existsSync(SOURCE)) {
	console.error(`Source logo not found: ${SOURCE}`);
	process.exit(1);
}

const result = Bun.spawnSync(
	[
		"magick",
		SOURCE,
		"-resize",
		`${SIZE}x${SIZE}`,
		"-strip",
		"-define",
		"png:exclude-chunk=time,date",
		TARGET,
	],
	{ stderr: "inherit", stdout: "inherit" },
);

if (result.exitCode !== 0) {
	console.error(`magick failed with exit code ${result.exitCode}`);
	process.exit(result.exitCode);
}

console.info(`Wrote ${path.relative(ROOT, TARGET)} (${SIZE}x${SIZE})`);
