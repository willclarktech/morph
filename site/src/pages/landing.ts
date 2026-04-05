import { highlightMorph } from "@morphdsl/morph-highlight";
import { layout } from "../layout";

const PASTEBIN_SCHEMA = `domain Pastebin

extensions {
  storage [memory, sqlite, redis] default memory
}

context pastes "Simple pastebin for sharing text snippets." {

  @root
  entity Paste "A text snippet shared via URL." {
    content: string "The paste content"
    createdAt: string "When the paste was created"
    title: string "Optional title for the paste"
  }

  @cli @api @ui
  command createPaste "Create a new paste."
    writes Paste
    input {
      content: string "The paste content"
      title?: string "Optional title"
    }
    output Paste
    emits PasteCreated "Emitted when a new paste is created"

  @cli @api @ui
  query listPastes "List all pastes."
    reads Paste
    input {}
    output Paste[]
}`;

const FEATURES = [
	{
		title: "One Schema, 13 Targets",
		description:
			"REST API, CLI, MCP server, VS Code extension, web UI, HTTP client, protocol buffers, property tests, formal verification — all from a single <code>.morph</code> file.",
	},
	{
		title: "Deterministic Generation",
		description:
			"No LLMs in the pipeline. Every transformation is mechanical and structure-preserving. If the core is correct, derived apps are correct by construction.",
	},
	{
		title: "Algebraic Foundations",
		description:
			"Built on Lawvere's functorial semantics. A <code>.morph</code> schema defines an algebraic theory; each generator is a structure-preserving functor.",
	},
	{
		title: "Pure Business Logic",
		description:
			"You write only domain handlers and scenario tests. Everything else — types, routes, commands, UI, client code — is generated.",
	},
	{
		title: "Pluggable Extensions",
		description:
			"5 storage backends (memory, JSON, SQLite, Redis, event-sourced), multiple auth strategies, domain events — all swappable via environment variables.",
	},
	{
		title: "Property-Based Testing",
		description:
			"Scenarios run as algebraic laws across multiple targets. If core passes but API fails, the natural transformation has a bug — the diagram doesn't commute.",
	},
];

export const landingPage = (): string =>
	layout({
		title: "Home",
		currentPath: "/",
		content: `
		<section class="hero">
			<hgroup>
				<h1>Algebraic code generation from domain schemas</h1>
				<p>Write a <code>.morph</code> schema once. Generate branded types, REST APIs, CLIs, MCP servers, VS Code extensions, web UIs, and more — all mechanically correct.</p>
			</hgroup>
			<div class="hero-actions">
				<a href="/docs/guides/getting-started" role="button">Get Started</a>
				<a href="/playground" role="button" class="outline">Try the Playground</a>
			</div>
		</section>

		<section>
			<h2>Quick Start</h2>
			<pre><code class="language-sh">bun install
bun run generate:examples
cd examples/pastebin && bun run apps/api/src/index.ts</code></pre>
		</section>

		<section>
			<h2>Example Schema</h2>
			<pre><code class="language-morph">${highlightMorph(PASTEBIN_SCHEMA)}</code></pre>
			<p><a href="/playground#${encodeURIComponent(PASTEBIN_SCHEMA)}">Open in Playground →</a></p>
		</section>

		<section>
			<h2>Features</h2>
			<div class="grid">
				${FEATURES.map(
					(f) => `<article>
					<h3>${f.title}</h3>
					<p>${f.description}</p>
				</article>`,
				).join("\n\t\t\t\t")}
			</div>
		</section>

		<section>
			<h2>Generation Targets</h2>
			<div class="overflow-auto">
				<table>
					<thead>
						<tr><th>Target</th><th>What it produces</th></tr>
					</thead>
					<tbody>
						<tr><td>dsl</td><td>Branded IDs, Effect schemas, operation descriptors</td></tr>
						<tr><td>core</td><td>Handler interfaces, repository ports, DI layers</td></tr>
						<tr><td>api</td><td>REST routes, OpenAPI spec, SSE event streams</td></tr>
						<tr><td>cli</td><td>Interactive REPL and one-off commands</td></tr>
						<tr><td>mcp</td><td>MCP server exposing operations as LLM tools</td></tr>
						<tr><td>ui</td><td>Server-rendered web UI (Pico CSS)</td></tr>
						<tr><td>vscode</td><td>VS Code extension with DSL language support</td></tr>
						<tr><td>client</td><td>Type-safe HTTP client library</td></tr>
						<tr><td>proto</td><td>Protocol buffer definitions</td></tr>
						<tr><td>verification</td><td>SMT-LIB2 formal verification (Z3)</td></tr>
					</tbody>
				</table>
			</div>
		</section>`,
	});

