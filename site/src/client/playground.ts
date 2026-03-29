import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { morphLanguage, morphLinter, morphCompletion, formatMorph } from "@morphdsl/codemirror-lang-morph";
import { parse } from "@morphdsl/schema-dsl-parser";
import { compile } from "@morphdsl/schema-dsl-compiler";
import { decompile } from "@morphdsl/schema-dsl-decompiler";

const TEMPLATE = `\
domain MyApp
	description "A sample application"

extensions {
	storage [memory, sqlite] default memory
}

context Catalog "Product catalog" {

	@root
	entity Product "A product in the catalog" {
		name: string "Product name"
		price: float "Price in dollars"
		active: boolean "Whether the product is listed"
	}

	@cli @api @ui
	command createProduct "Create a new product"
		writes Product
		input {
			name: string "Product name"
			price: float "Price"
		}
		output Product
		emits ProductCreated "Emitted when a product is created"

	@cli @api @ui
	query listProducts "List all products"
		reads Product
		input {}
		output Product[]
}
`;

let editor: EditorView;
let debounceTimer: ReturnType<typeof setTimeout>;

const initEditor = () => {
	const editorEl = document.getElementById("editor");
	if (!editorEl) return;

	const initialSchema = decodeURIComponent(location.hash.slice(1)) || TEMPLATE;

	editor = new EditorView({
		parent: editorEl,
		state: EditorState.create({
			doc: initialSchema,
			extensions: [
				basicSetup,
				morphLanguage(),
				morphLinter(),
				morphCompletion(),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						clearTimeout(debounceTimer);
						debounceTimer = setTimeout(() => runDiagnostics(), 300);
					}
				}),
			],
		}),
	});

	runDiagnostics();
};

const runDiagnostics = () => {
	const source = editor.state.doc.toString();
	const diagnosticsEl = document.getElementById("diagnostics-output");
	const statusEl = document.getElementById("status");
	if (!diagnosticsEl || !statusEl) return;

	const parseResult = parse(source);
	if (parseResult.errors.length > 0) {
		diagnosticsEl.innerHTML = parseResult.errors
			.map((e) => {
				const cls = e.severity === "error" ? "diagnostic-error" : "diagnostic-warning";
				return `<span class="${cls}">Line ${e.range.start.line}:${e.range.start.column} — ${escapeHtml(e.message)}</span>`;
			})
			.join("\n");
		statusEl.textContent = `${parseResult.errors.length} error(s)`;
		return;
	}

	if (!parseResult.ast) {
		diagnosticsEl.textContent = "Parse returned no AST";
		return;
	}

	const compileResult = compile(parseResult.ast);
	if (compileResult.errors.length > 0) {
		diagnosticsEl.innerHTML = compileResult.errors
			.map(
				(e) =>
					`<span class="diagnostic-error">Line ${e.range.start.line}:${e.range.start.column} — ${escapeHtml(e.message)}</span>`,
			)
			.join("\n");
		statusEl.textContent = `${compileResult.errors.length} error(s)`;
		return;
	}

	diagnosticsEl.innerHTML = '<span style="color: var(--pico-ins-color, green)">No errors</span>';
	statusEl.textContent = "Valid";
};

const runFormat = () => {
	const source = editor.state.doc.toString();
	const formattedEl = document.getElementById("formatted-output");
	if (!formattedEl) return;

	const formatted = formatMorph(source);
	if (formatted !== undefined) {
		formattedEl.textContent = formatted;
		switchTab("formatted");
	} else {
		formattedEl.textContent = "Cannot format — schema has errors";
	}
};

const runGenerate = () => {
	const source = editor.state.doc.toString();
	const treeEl = document.getElementById("generated-tree");
	const contentEl = document.getElementById("generated-content");
	if (!treeEl || !contentEl) return;

	const parseResult = parse(source);
	if (!parseResult.ast || parseResult.errors.length > 0) {
		treeEl.innerHTML = '<span class="diagnostic-error">Fix errors before generating</span>';
		contentEl.textContent = "";
		return;
	}

	const compileResult = compile(parseResult.ast);
	if (!compileResult.schema || compileResult.errors.length > 0) {
		treeEl.innerHTML = '<span class="diagnostic-error">Compilation errors — cannot generate</span>';
		contentEl.textContent = "";
		return;
	}

	const schemaJson = JSON.stringify(compileResult.schema, undefined, "\t");
	const files = [{ filename: "schema.json", content: schemaJson }];

	treeEl.innerHTML = files
		.map(
			(f, i) =>
				`<div class="file-tree-item${i === 0 ? " selected" : ""}" data-index="${i}">${escapeHtml(f.filename)}</div>`,
		)
		.join("");
	contentEl.textContent = files[0]?.content ?? "";

	treeEl.querySelectorAll(".file-tree-item").forEach((item) => {
		item.addEventListener("click", () => {
			treeEl.querySelectorAll(".file-tree-item").forEach((el) => el.classList.remove("selected"));
			item.classList.add("selected");
			const idx = parseInt((item as HTMLElement).dataset.index ?? "0", 10);
			contentEl.textContent = files[idx]?.content ?? "";
		});
	});
};

const switchTab = (tabName: string) => {
	document.querySelectorAll(".output-tabs button").forEach((btn) => {
		btn.setAttribute("aria-selected", (btn as HTMLElement).dataset.tab === tabName ? "true" : "false");
	});
	document.querySelectorAll(".tab-panel").forEach((panel) => {
		panel.classList.toggle("active", panel.id === `tab-${tabName}`);
	});

	if (tabName === "generated") runGenerate();
};

const escapeHtml = (s: string): string =>
	s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

document.addEventListener("DOMContentLoaded", () => {
	initEditor();

	document.getElementById("btn-format")?.addEventListener("click", runFormat);
	document.getElementById("btn-template")?.addEventListener("click", () => {
		editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: TEMPLATE },
		});
	});
	document.getElementById("btn-share")?.addEventListener("click", () => {
		const source = editor.state.doc.toString();
		location.hash = encodeURIComponent(source);
		navigator.clipboard?.writeText(location.href);
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.textContent = "URL copied!";
			setTimeout(() => { statusEl.textContent = "Ready"; }, 2000);
		}
	});

	document.querySelectorAll(".output-tabs button").forEach((btn) => {
		btn.addEventListener("click", () => {
			switchTab((btn as HTMLElement).dataset.tab ?? "diagnostics");
		});
	});
});
