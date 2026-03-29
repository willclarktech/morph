import { join } from "node:path";
import MarkdownIt from "markdown-it";
import { landingPage } from "./pages/landing";
import { docsPage, docsIndex, DOC_ENTRIES } from "./pages/docs";
import { playgroundPage } from "./pages/playground";
import { examplesPage } from "./pages/examples";
import { loadExamples } from "./data/examples";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const DOCS_DIR = join(import.meta.dir, "../../docs");
const PUBLIC_DIR = join(import.meta.dir, "../public");
const CLIENT_DIR = join(import.meta.dir, "client");
const LOGO_PATH = join(DOCS_DIR, "images/logo.png");

const renderDoc = async (slug: string): Promise<string | undefined> => {
	const file = Bun.file(join(DOCS_DIR, `${slug}.md`));
	if (!(await file.exists())) return undefined;
	const content = await file.text();
	return md.render(content);
};

const extractTitle = (slug: string): string => {
	const entry = DOC_ENTRIES.find((e) => e.slug === slug);
	return entry?.title ?? slug;
};

const examples = await loadExamples();

const serveStatic = async (filePath: string, contentType: string): Promise<Response> => {
	const file = Bun.file(filePath);
	if (await file.exists()) {
		return new Response(file, { headers: { "content-type": contentType } });
	}
	return new Response("Not Found", { status: 404 });
};

const getContentType = (path: string): string => {
	if (path.endsWith(".css")) return "text/css";
	if (path.endsWith(".js")) return "application/javascript";
	if (path.endsWith(".png")) return "image/png";
	if (path.endsWith(".svg")) return "image/svg+xml";
	if (path.endsWith(".ico")) return "image/x-icon";
	return "application/octet-stream";
};

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// Logo from docs/images
		if (path === "/logo.png") {
			return new Response(Bun.file(LOGO_PATH), { headers: { "content-type": "image/png" } });
		}

		// Static assets from public/
		if (path.match(/\.\w+$/)) {
			// Client JS files — build on the fly
			if (path === "/playground.js") {
				const result = await Bun.build({
					entrypoints: [join(CLIENT_DIR, "playground.ts")],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (result.success && result.outputs[0]) {
					return new Response(await result.outputs[0].text(), {
						headers: { "content-type": "application/javascript" },
					});
				}
				return new Response("Build failed", { status: 500 });
			}
			if (path === "/mermaid-init.js") {
				const result = await Bun.build({
					entrypoints: [join(CLIENT_DIR, "mermaid-init.ts")],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (result.success && result.outputs[0]) {
					return new Response(await result.outputs[0].text(), {
						headers: { "content-type": "application/javascript" },
					});
				}
				return new Response("Build failed", { status: 500 });
			}
			if (path === "/examples-browser.js") {
				const result = await Bun.build({
					entrypoints: [join(CLIENT_DIR, "examples-browser.ts")],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (result.success && result.outputs[0]) {
					return new Response(await result.outputs[0].text(), {
						headers: { "content-type": "application/javascript" },
					});
				}
				return new Response("Build failed", { status: 500 });
			}

			return serveStatic(join(PUBLIC_DIR, path), getContentType(path));
		}

		// Pages
		if (path === "/") {
			return new Response(landingPage(), { headers: { "content-type": "text/html" } });
		}

		if (path === "/playground") {
			return new Response(playgroundPage(), { headers: { "content-type": "text/html" } });
		}

		if (path === "/examples") {
			return new Response(examplesPage(examples), { headers: { "content-type": "text/html" } });
		}

		if (path === "/docs" || path === "/docs/") {
			return new Response(docsIndex(), { headers: { "content-type": "text/html" } });
		}

		if (path.startsWith("/docs/")) {
			const slug = path.replace("/docs/", "");
			const rendered = await renderDoc(slug);
			if (rendered) {
				return new Response(docsPage(slug, rendered, extractTitle(slug)), {
					headers: { "content-type": "text/html" },
				});
			}
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log("Site dev server running at http://localhost:3000");
