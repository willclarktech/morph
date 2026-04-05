import { highlightMorph } from "@morphdsl/morph-highlight";
import MarkdownIt from "markdown-it";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { stubServerModules } from "./build-plugin-stub-server";
import { loadExamples } from "./data/examples";
import { DOC_ENTRIES, docsIndex, docsPage } from "./pages/docs";
import { examplesPage } from "./pages/examples";
import { landingPage } from "./pages/landing";
import { playgroundPage } from "./pages/playground";

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	highlight: (string_, lang) => {
		if (lang === "morph") return highlightMorph(string_);
		return "";
	},
});

const SITE_DIR = path.join(import.meta.dir, "..");
const DIST_DIR = path.join(SITE_DIR, "dist");
const PUBLIC_DIR = path.join(SITE_DIR, "public");
const CLIENT_DIR = path.join(import.meta.dir, "client");
const DOCS_DIR = path.join(SITE_DIR, "..", "docs");

const writeFile = async (filePath: string, content: string) => {
	const dir = path.join(filePath, "..");
	await mkdir(dir, { recursive: true });
	await Bun.write(filePath, content);
};

console.info("Building site...");

// Clean
await rm(DIST_DIR, { recursive: true, force: true });
await mkdir(DIST_DIR, { recursive: true });

// 1. Copy static assets
console.info("Copying static assets...");
await cp(PUBLIC_DIR, DIST_DIR, { recursive: true });

// Copy logo
const logoSource = path.join(SITE_DIR, "..", "docs", "images", "logo.png");
await cp(logoSource, path.join(DIST_DIR, "logo.png"));

// 2. Bundle client-side JS
console.info("Bundling client JS...");
const clientEntries = [
	{ entry: "playground.ts", output: "playground.js" },
	{ entry: "mermaid-init.ts", output: "mermaid-init.js" },
	{ entry: "examples-browser.ts", output: "examples-browser.js" },
];

for (const { entry, output } of clientEntries) {
	const result = await Bun.build({
		entrypoints: [path.join(CLIENT_DIR, entry)],
		outdir: DIST_DIR,
		naming: output,
		format: "esm",
		target: "browser",
		minify: true,
		plugins: [stubServerModules],
		loader: { ".morph": "text" },
	});
	if (!result.success) {
		console.error(`Failed to bundle ${entry}:`, result.logs);
		process.exit(1);
	}
	console.info(`  Bundled ${output}`);
}

// 3. Generate HTML pages
console.info("Generating pages...");

// Landing page
await writeFile(path.join(DIST_DIR, "index.html"), landingPage());

// Playground
await writeFile(
	path.join(DIST_DIR, "playground", "index.html"),
	playgroundPage(),
);

// Examples
const examples = await loadExamples();
await writeFile(
	path.join(DIST_DIR, "examples", "index.html"),
	examplesPage(examples),
);

// Docs index
await writeFile(path.join(DIST_DIR, "docs", "index.html"), docsIndex());

// Individual docs
for (const entry of DOC_ENTRIES) {
	const file = Bun.file(path.join(DOCS_DIR, `${entry.slug}.md`));
	if (!(await file.exists())) {
		console.warn(`  Warning: ${entry.slug}.md not found`);
		continue;
	}
	const content = await file.text();
	const rendered = md.render(content);
	await writeFile(
		path.join(DIST_DIR, "docs", entry.slug, "index.html"),
		docsPage(entry.slug, rendered, entry.title),
	);
	console.info(`  Generated docs/${entry.slug}`);
}

// 4. Write .nojekyll for GitHub Pages
await Bun.write(path.join(DIST_DIR, ".nojekyll"), "");

console.info(`\nSite built to ${DIST_DIR}`);

// List output
const countFiles = async (dir: string): Promise<number> => {
	let count = 0;
	const entries = await readdir(dir, { withFileTypes: true, recursive: true });
	for (const entry of entries) {
		if (entry.isFile()) count++;
	}
	return count;
};
const fileCount = await countFiles(DIST_DIR);
console.info(`Total files: ${fileCount}`);
