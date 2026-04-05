import { layout } from "../layout";

interface DocEntry {
	readonly slug: string;
	readonly title: string;
	readonly section: string;
}

const DOC_ENTRIES: readonly DocEntry[] = [
	{ slug: "guides/getting-started", title: "Getting Started", section: "Guides" },
	{ slug: "guides/dsl-reference", title: "DSL Reference", section: "Reference" },
	{ slug: "concepts/ddd-primer", title: "DDD Primer", section: "Concepts" },
	{ slug: "concepts/algebraic-foundations", title: "Algebraic Foundations", section: "Concepts" },
	{ slug: "concepts/cqrs", title: "CQRS", section: "Concepts" },
	{ slug: "concepts/domain-events", title: "Domain Events", section: "Concepts" },
	{ slug: "concepts/transformation-domains", title: "Transformation Domains", section: "Concepts" },
	{ slug: "concepts/modeling-by-example", title: "Modeling by Example", section: "Concepts" },
	{ slug: "concepts/features-and-bugs", title: "Features and Bugs", section: "Concepts" },
	{ slug: "testing/testing-philosophy", title: "Testing Philosophy", section: "Concepts" },
	{ slug: "testing/formal-verification", title: "Formal Verification", section: "Concepts" },
	{ slug: "architecture/tour", title: "Source Tour", section: "Architecture" },
	{ slug: "architecture/contexts-structure", title: "Contexts Structure", section: "Architecture" },
	{ slug: "architecture/extensions", title: "Extensions", section: "Architecture" },
	{ slug: "architecture/12-factor", title: "12-Factor Conformance", section: "Architecture" },
	{ slug: "design/design-decisions", title: "Design Decisions", section: "Architecture" },
	{ slug: "design/authorization", title: "Authorization", section: "Architecture" },
	{ slug: "design/context", title: "Execution Context", section: "Architecture" },
	{ slug: "design/schema-model", title: "Schema Model", section: "Architecture" },
	{ slug: "design/ui-auth", title: "UI Authentication", section: "Architecture" },
	{ slug: "design/prose-design", title: "Prose Design", section: "Architecture" },
];

export { DOC_ENTRIES };
export type { DocEntry };

const buildSidebar = (currentSlug: string): string => {
	const sections = new Map<string, DocEntry[]>();
	for (const entry of DOC_ENTRIES) {
		const list = sections.get(entry.section) ?? [];
		list.push(entry);
		sections.set(entry.section, list);
	}

	let html = '<aside class="docs-sidebar"><nav>';
	for (const [section, entries] of sections) {
		html += `<details${entries.some((e) => e.slug === currentSlug) ? " open" : ""}>`;
		html += `<summary>${section}</summary>`;
		html += "<ul>";
		for (const entry of entries) {
			const active = entry.slug === currentSlug ? ' aria-current="page"' : "";
			html += `<li><a href="/docs/${entry.slug}"${active}>${entry.title}</a></li>`;
		}
		html += "</ul></details>";
	}
	html += "</nav></aside>";
	return html;
};

export const docsPage = (slug: string, renderedHtml: string, title: string): string =>
	layout({
		title,
		currentPath: `/docs/${slug}`,
		headExtra: '<link rel="stylesheet" href="/docs.css">',
		bodyExtra: '<script type="module" src="/mermaid-init.js"></script>',
		content: `
		<div class="docs-layout">
			${buildSidebar(slug)}
			<article class="docs-content">
				${renderedHtml}
			</article>
		</div>`,
	});

export const docsIndex = (): string =>
	layout({
		title: "Documentation",
		currentPath: "/docs",
		headExtra: '<link rel="stylesheet" href="/docs.css">',
		content: `
		<div class="docs-layout">
			${buildSidebar("")}
			<article class="docs-content">
				<h1>Documentation</h1>
				<p>Morph documentation covering guides, concepts, architecture, and design decisions.</p>
				<p><a href="/docs/guides/getting-started">Get started →</a></p>
			</article>
		</div>`,
	});
