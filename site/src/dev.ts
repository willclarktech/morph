import { highlightMorph } from "@morphdsl/morph-highlight";
import MarkdownIt from "markdown-it";
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

const DOCS_DIR = path.join(import.meta.dir, "../../docs");
const PUBLIC_DIR = path.join(import.meta.dir, "../public");
const CLIENT_DIR = path.join(import.meta.dir, "client");
const LOGO_PATH = path.join(DOCS_DIR, "images/logo.png");

const renderDocument = async (slug: string): Promise<string | undefined> => {
	const file = Bun.file(path.join(DOCS_DIR, `${slug}.md`));
	if (!(await file.exists())) return undefined;
	const content = await file.text();
	return md.render(content);
};

const extractTitle = (slug: string): string => {
	const entry = DOC_ENTRIES.find((item) => item.slug === slug);
	return entry?.title ?? slug;
};

const examples = await loadExamples();

const serveStatic = async (
	filePath: string,
	contentType: string,
): Promise<Response> => {
	const file = Bun.file(filePath);
	if (await file.exists()) {
		return new Response(file, { headers: { "content-type": contentType } });
	}
	return new Response("Not Found", { status: 404 });
};

const getContentType = (filePath: string): string => {
	if (filePath.endsWith(".css")) return "text/css";
	if (filePath.endsWith(".js")) return "application/javascript";
	if (filePath.endsWith(".png")) return "image/png";
	if (filePath.endsWith(".svg")) return "image/svg+xml";
	if (filePath.endsWith(".ico")) return "image/x-icon";
	return "application/octet-stream";
};

const buildClientJs = async (entrypoint: string) => {
	const result = await Bun.build({
		entrypoints: [path.join(CLIENT_DIR, entrypoint)],
		format: "esm",
		target: "browser",
		minify: false,
		plugins: [stubServerModules],
		loader: { ".morph": "text" },
	});
	if (result.success && result.outputs[0]) {
		return new Response(await result.outputs[0].text(), {
			headers: { "content-type": "application/javascript" },
		});
	}
	return new Response("Build failed", { status: 500 });
};

Bun.serve({
	port: 3000,
	async fetch(request) {
		const url = new URL(request.url);
		const requestPath = url.pathname;

		// Logo from docs/images
		if (requestPath === "/logo.png") {
			return new Response(Bun.file(LOGO_PATH), {
				headers: { "content-type": "image/png" },
			});
		}

		// Static assets from public/
		if (/\.\w+$/.test(requestPath)) {
			if (requestPath === "/playground.js")
				return buildClientJs("playground.ts");
			if (requestPath === "/mermaid-init.js")
				return buildClientJs("mermaid-init.ts");
			if (requestPath === "/examples-browser.js")
				return buildClientJs("examples-browser.ts");

			return serveStatic(
				path.join(PUBLIC_DIR, requestPath),
				getContentType(requestPath),
			);
		}

		// Pages
		if (requestPath === "/") {
			return new Response(landingPage(), {
				headers: { "content-type": "text/html" },
			});
		}

		if (requestPath === "/playground") {
			return new Response(playgroundPage(), {
				headers: { "content-type": "text/html" },
			});
		}

		if (requestPath === "/examples") {
			return new Response(examplesPage(examples), {
				headers: { "content-type": "text/html" },
			});
		}

		if (requestPath === "/docs" || requestPath === "/docs/") {
			return new Response(docsIndex(), {
				headers: { "content-type": "text/html" },
			});
		}

		if (requestPath.startsWith("/docs/")) {
			const slug = requestPath.replace("/docs/", "");
			const rendered = await renderDocument(slug);
			if (rendered) {
				return new Response(docsPage(slug, rendered, extractTitle(slug)), {
					headers: { "content-type": "text/html" },
				});
			}
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.info("Site dev server running at http://localhost:3000");
