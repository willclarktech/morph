import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import {
	morphLanguage,
	morphLinter,
	morphCompletion,
	formatMorph,
} from "@morphdsl/codemirror-lang-morph";
import { parse } from "@morphdsl/schema-dsl-parser";
import { compile } from "@morphdsl/schema-dsl-compiler";
import { executeGenerate } from "@morphdsl/generation-impls";
import { Effect } from "effect";

const TEMPLATE = `\
domain MyApp
	license "MIT"
	author "Your Name"
	description "A sample application"
	repository "https://github.com/your-org/my-app"

extensions {
	storage [memory, sqlite, redis] default memory
	eventStore [memory] default memory
}

context Catalog "Product catalog bounded context" {

	entity Category {
		id: string
		name: string
	}

	@root
	entity Product {
		active: boolean
		category: "electronics" | "clothing" | "food"
		createdAt: datetime
		description: string?
		dueDate?: date
		id: string
		@unique
		name: string
		price: float
		quantity: integer
		sku: string
		slug: string
		belongs_to Category "Product category"
	}

	value Money "Monetary amount" {
		amount: float
		currency: string
	}

	@context
	invariant HasName
		"Product must have a name"
		violation "Name is required"
		where name != ""

	invariant PositivePrice on Product
		"Price must be positive when product is active"
		violation "Price must be greater than zero"
		where active == false || price > 0

	command CreateProduct "Create a new product in the catalog"
		reads Product, writes Product
		pre HasName
		input {
			name: string
			price: float
			@sensitive
			sku: string
		}
		output Product
		emits ProductCreated "Emitted when a product is created"
		errors {
			DuplicateSku "A product with this SKU already exists" when "sku is taken"
		}

	command UpdatePrice "Update the price of an existing product"
		reads Product, writes Product
		input {
			id: string
			newPrice: float
		}
		output Product
		emits PriceChanged "Emitted when a product price changes"
		errors {
			ProductNotFound "No product found with the given ID" when "id does not exist"
		}

	query GetProduct "Retrieve a product by ID"
		reads Product
		input {
			id: string
		}
		output Product?
		errors {
			ProductNotFound "No product found with the given ID" when "id does not exist"
		}

	query ListProducts "List all products, optionally filtered by category"
		reads Product
		input {
			category: string?
		}
		output Product[]

	function ValidateSku "Check whether a SKU format is valid"
		input {
			sku: string
		}
		output boolean

	subscriber OnProductCreated "Handle product creation side effects"
		on ProductCreated
}
`;

interface GeneratedFile {
	readonly filename: string;
	readonly content: string;
}

interface FolderNode {
	readonly folders: Map<string, FolderNode>;
	readonly fileIndices: number[];
	totalFiles: number;
}

let editor: EditorView;
let debounceTimer: ReturnType<typeof setTimeout>;

const initEditor = () => {
	const editorEl = document.getElementById("editor");
	if (!editorEl) return;

	const initialSchema =
		decodeURIComponent(location.hash.slice(1)) || TEMPLATE;

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
				const cls =
					e.severity === "error"
						? "diagnostic-error"
						: "diagnostic-warning";
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

	diagnosticsEl.innerHTML =
		'<span style="color: var(--pico-ins-color, green)">No errors</span>';
	statusEl.textContent = "Valid";
};

const runFormat = () => {
	const source = editor.state.doc.toString();
	const statusEl = document.getElementById("status");
	if (!statusEl) return;

	const formatted = formatMorph(source);
	if (formatted !== undefined) {
		editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: formatted },
		});
		statusEl.textContent = "Formatted!";
		setTimeout(() => {
			statusEl.textContent = "Ready";
		}, 1500);
	} else {
		statusEl.textContent = "Cannot format — errors";
		setTimeout(() => {
			statusEl.textContent = "Ready";
		}, 2000);
	}
};

const buildFileTree = (files: readonly GeneratedFile[]): FolderNode => {
	const root: FolderNode = {
		folders: new Map(),
		fileIndices: [],
		totalFiles: 0,
	};

	files.forEach((file, index) => {
		const parts = file.filename.split("/");
		let node = root;
		for (let i = 0; i < parts.length - 1; i++) {
			let next = node.folders.get(parts[i]);
			if (!next) {
				next = { folders: new Map(), fileIndices: [], totalFiles: 0 };
				node.folders.set(parts[i], next);
			}
			node = next;
		}
		node.fileIndices.push(index);
	});

	const count = (n: FolderNode): number => {
		n.totalFiles = n.fileIndices.length;
		for (const child of n.folders.values()) n.totalFiles += count(child);
		return n.totalFiles;
	};
	count(root);

	return root;
};

const countFolders = (node: FolderNode): number => {
	let n = node.folders.size;
	for (const child of node.folders.values()) n += countFolders(child);
	return n;
};

const renderFolderHtml = (
	node: FolderNode,
	files: readonly GeneratedFile[],
	depth: number,
): string => {
	let html = "";
	const indent = depth * 12;

	const sortedFolders = [...node.folders.entries()].sort(([a], [b]) =>
		a.localeCompare(b),
	);
	for (const [name, folder] of sortedFolders) {
		html +=
			`<div class="folder-header" style="padding-left: ${indent}px" data-expanded="false">` +
			`<span class="folder-toggle">▸</span> ${escapeHtml(name)}/ ` +
			`<span class="folder-count">${folder.totalFiles}</span></div>`;
		html += `<div class="folder-children" hidden>`;
		html += renderFolderHtml(folder, files, depth + 1);
		html += `</div>`;
	}

	const sortedFiles = [...node.fileIndices].sort((a, b) => {
		const nameA = files[a].filename.split("/").pop() ?? "";
		const nameB = files[b].filename.split("/").pop() ?? "";
		return nameA.localeCompare(nameB);
	});
	for (const idx of sortedFiles) {
		const fileName = files[idx].filename.split("/").pop() ?? "";
		html += `<div class="file-tree-item" style="padding-left: ${indent + 16}px" data-index="${idx}">${escapeHtml(fileName)}</div>`;
	}

	return html;
};

const renderFileTree = (
	files: readonly GeneratedFile[],
	treeEl: HTMLElement,
	contentEl: HTMLElement,
	summaryEl: HTMLElement | undefined,
) => {
	if (files.length === 0) {
		treeEl.innerHTML =
			'<span class="diagnostic-warning">No files generated</span>';
		contentEl.textContent = "";
		if (summaryEl) summaryEl.textContent = "";
		return;
	}

	const tree = buildFileTree(files);
	const folderCount = countFolders(tree);

	if (summaryEl) {
		summaryEl.textContent = `${files.length} files generated across ${folderCount} directories`;
	}

	treeEl.innerHTML = renderFolderHtml(tree, files, 0);

	const firstItem = treeEl.querySelector(".file-tree-item");
	if (firstItem) {
		firstItem.classList.add("selected");
		const idx = parseInt(
			firstItem.getAttribute("data-index") ?? "0",
			10,
		);
		contentEl.textContent = files[idx]?.content ?? "";
	}

	treeEl.querySelectorAll(".folder-header").forEach((header) => {
		header.addEventListener("click", () => {
			const expanded =
				header.getAttribute("data-expanded") === "true";
			header.setAttribute(
				"data-expanded",
				expanded ? "false" : "true",
			);
			const toggle = header.querySelector(".folder-toggle");
			if (toggle) toggle.textContent = expanded ? "▸" : "▾";
			const children = header.nextElementSibling;
			if (children) (children as HTMLElement).hidden = expanded;
		});
	});

	treeEl.querySelectorAll(".file-tree-item").forEach((item) => {
		item.addEventListener("click", () => {
			treeEl
				.querySelectorAll(".file-tree-item")
				.forEach((el) => el.classList.remove("selected"));
			item.classList.add("selected");
			const idx = parseInt(
				item.getAttribute("data-index") ?? "0",
				10,
			);
			contentEl.textContent = files[idx]?.content ?? "";
		});
	});
};

const runGenerate = () => {
	const source = editor.state.doc.toString();
	const treeEl = document.getElementById("generated-tree");
	const contentEl = document.getElementById("generated-content");
	const summaryEl = document.getElementById("generated-summary");
	const statusEl = document.getElementById("status");
	if (!treeEl || !contentEl) return;

	const parseResult = parse(source);
	if (!parseResult.ast || parseResult.errors.length > 0) {
		treeEl.innerHTML =
			'<span class="diagnostic-error">Fix errors before generating</span>';
		contentEl.textContent = "";
		if (summaryEl) summaryEl.textContent = "";
		return;
	}

	const compileResult = compile(parseResult.ast);
	if (!compileResult.schema || compileResult.errors.length > 0) {
		treeEl.innerHTML =
			'<span class="diagnostic-error">Compilation errors — cannot generate</span>';
		contentEl.textContent = "";
		if (summaryEl) summaryEl.textContent = "";
		return;
	}

	try {
		const result = Effect.runSync(
			executeGenerate(compileResult.schema, compileResult.schema.name),
		);
		const filesWithSchema: GeneratedFile[] = [
			{
				filename: "schema.json",
				content: JSON.stringify(compileResult.schema, undefined, "\t"),
			},
			...result.files,
		];
		renderFileTree(
			filesWithSchema,
			treeEl,
			contentEl,
			summaryEl ?? undefined,
		);
		switchTab("generated");
		if (statusEl) {
			statusEl.textContent = `Generated ${result.files.length} files`;
			setTimeout(() => {
				statusEl.textContent = "Ready";
			}, 3000);
		}
	} catch (e) {
		treeEl.innerHTML = `<span class="diagnostic-error">Generation failed: ${escapeHtml(e instanceof Error ? e.message : String(e))}</span>`;
		contentEl.textContent = "";
		if (summaryEl) summaryEl.textContent = "";
		if (statusEl) statusEl.textContent = "Ready";
	}
};

const switchTab = (tabName: string) => {
	document.querySelectorAll(".output-tabs button").forEach((btn) => {
		btn.setAttribute(
			"aria-selected",
			btn.getAttribute("data-tab") === tabName ? "true" : "false",
		);
	});
	document.querySelectorAll(".tab-panel").forEach((panel) => {
		panel.classList.toggle("active", panel.id === `tab-${tabName}`);
	});
};

const escapeHtml = (s: string): string =>
	s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

document.addEventListener("DOMContentLoaded", () => {
	initEditor();

	const treeEl = document.getElementById("generated-tree");
	if (treeEl) {
		treeEl.innerHTML =
			"<p>Click <strong>Generate</strong> to see output.</p>";
	}

	document
		.getElementById("btn-format")
		?.addEventListener("click", runFormat);
	document
		.getElementById("btn-generate")
		?.addEventListener("click", runGenerate);
	document.getElementById("btn-template")?.addEventListener("click", () => {
		editor.dispatch({
			changes: {
				from: 0,
				to: editor.state.doc.length,
				insert: TEMPLATE,
			},
		});
		runGenerate();
	});
	document.getElementById("btn-share")?.addEventListener("click", () => {
		const source = editor.state.doc.toString();
		location.hash = encodeURIComponent(source);
		navigator.clipboard?.writeText(location.href);
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.textContent = "URL copied!";
			setTimeout(() => {
				statusEl.textContent = "Ready";
			}, 2000);
		}
	});

	document.querySelectorAll(".output-tabs button").forEach((btn) => {
		btn.addEventListener("click", () => {
			switchTab(btn.getAttribute("data-tab") ?? "diagnostics");
		});
	});
});
