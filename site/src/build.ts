import { join } from "node:path";
import { mkdir, cp, readdir, rm } from "node:fs/promises";
import MarkdownIt from "markdown-it";
import { landingPage } from "./pages/landing";
import { docsPage, docsIndex, DOC_ENTRIES } from "./pages/docs";
import { playgroundPage } from "./pages/playground";
import { examplesPage } from "./pages/examples";
import { loadExamples } from "./data/examples";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const SITE_DIR = join(import.meta.dir, "..");
const DIST_DIR = join(SITE_DIR, "dist");
const PUBLIC_DIR = join(SITE_DIR, "public");
const CLIENT_DIR = join(import.meta.dir, "client");
const DOCS_DIR = join(SITE_DIR, "..", "docs");

const writeFile = async (path: string, content: string) => {
	const dir = join(path, "..");
	await mkdir(dir, { recursive: true });
	await Bun.write(path, content);
};

console.log("Building site...");

// Clean
await rm(DIST_DIR, { recursive: true, force: true });
await mkdir(DIST_DIR, { recursive: true });

// 1. Copy static assets
console.log("Copying static assets...");
await cp(PUBLIC_DIR, DIST_DIR, { recursive: true });

// Copy logo
const logoSrc = join(SITE_DIR, "..", "docs", "images", "logo.png");
await cp(logoSrc, join(DIST_DIR, "logo.png"));

// 2. Bundle client-side JS
console.log("Bundling client JS...");
const clientEntries = [
	{ entry: "playground.ts", output: "playground.js" },
	{ entry: "mermaid-init.ts", output: "mermaid-init.js" },
	{ entry: "examples-browser.ts", output: "examples-browser.js" },
];

for (const { entry, output } of clientEntries) {
	const result = await Bun.build({
		entrypoints: [join(CLIENT_DIR, entry)],
		outdir: DIST_DIR,
		naming: output,
		format: "esm",
		target: "browser",
		minify: true,
	});
	if (!result.success) {
		console.error(`Failed to bundle ${entry}:`, result.logs);
		process.exit(1);
	}
	console.log(`  Bundled ${output}`);
}

// 3. Generate HTML pages
console.log("Generating pages...");

// Landing page
await writeFile(join(DIST_DIR, "index.html"), landingPage());

// Playground
await writeFile(join(DIST_DIR, "playground", "index.html"), playgroundPage());

// Examples
const examples = await loadExamples();
await writeFile(join(DIST_DIR, "examples", "index.html"), examplesPage(examples));

// Docs index
await writeFile(join(DIST_DIR, "docs", "index.html"), docsIndex());

// Individual docs
for (const entry of DOC_ENTRIES) {
	const file = Bun.file(join(DOCS_DIR, `${entry.slug}.md`));
	if (!(await file.exists())) {
		console.warn(`  Warning: ${entry.slug}.md not found`);
		continue;
	}
	const content = await file.text();
	const rendered = md.render(content);
	await writeFile(
		join(DIST_DIR, "docs", entry.slug, "index.html"),
		docsPage(entry.slug, rendered, entry.title),
	);
	console.log(`  Generated docs/${entry.slug}`);
}

// 4. Write .nojekyll for GitHub Pages
await Bun.write(join(DIST_DIR, ".nojekyll"), "");

console.log(`\nSite built to ${DIST_DIR}`);

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
console.log(`Total files: ${fileCount}`);
