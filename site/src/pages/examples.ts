import { url } from "../base-path";
import { layout } from "../layout";

export interface ExampleSnapshot {
	readonly name: string;
	readonly description: string;
	readonly schema: string;
}

export const examplesPage = (examples: readonly ExampleSnapshot[]): string =>
	layout({
		title: "Examples",
		currentPath: "/examples",
		bodyExtra: `<script type="module" src="${url("/examples-browser.js")}"></script>`,
		content: `
		<section>
			<h1>Example Schemas</h1>
			<p>Browse example <code>.morph</code> schemas demonstrating various features. Click to open in the playground.</p>
			<div class="grid">
				${examples
					.map(
						(ex) => `<article>
					<h3>${ex.name}</h3>
					<p>${escapeHtml(ex.description)}</p>
					<nav>
						<a href="${url("/playground")}#${encodeURIComponent(ex.schema)}" role="button" class="outline">Open in Playground</a>
					</nav>
				</article>`,
					)
					.join("\n\t\t\t\t")}
			</div>
		</section>`,
	});

const escapeHtml = (s: string): string =>
	s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
