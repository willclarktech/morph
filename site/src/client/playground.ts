import { EditorState } from "@codemirror/state";
import {
	formatMorph,
	morphCompletion,
	morphLanguage,
	morphLinter,
} from "@morphdsl/codemirror-lang-morph";
import { executeGenerate } from "@morphdsl/generation-impls";
import { compile } from "@morphdsl/schema-dsl-compiler";
import { TEMPLATE_SCHEMA } from "@morphdsl/schema-dsl-impls";
import { parse } from "@morphdsl/schema-dsl-parser";
import { basicSetup, EditorView } from "codemirror";
import { Effect } from "effect";

const TEMPLATE = TEMPLATE_SCHEMA;

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
	const editorElement = document.querySelector("#editor");
	if (!editorElement) return;

	const initialSchema = decodeURIComponent(location.hash.slice(1)) || TEMPLATE;

	editor = new EditorView({
		parent: editorElement,
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
	const diagnosticsElement = document.querySelector("#diagnostics-output");
	const statusElement = document.querySelector("#status");
	if (!diagnosticsElement || !statusElement) return;

	const parseResult = parse(source);
	if (parseResult.errors.length > 0) {
		diagnosticsElement.innerHTML = parseResult.errors
			.map((diagnostic) => {
				const cls =
					diagnostic.severity === "error"
						? "diagnostic-error"
						: "diagnostic-warning";
				return `<span class="${cls}">Line ${diagnostic.range.start.line}:${diagnostic.range.start.column} — ${escapeHtml(diagnostic.message)}</span>`;
			})
			.join("\n");
		statusElement.textContent = `${parseResult.errors.length} error(s)`;
		switchTab("diagnostics");
		return;
	}

	if (!parseResult.ast) {
		diagnosticsElement.textContent = "Parse returned no AST";
		switchTab("diagnostics");
		return;
	}

	const compileResult = compile(parseResult.ast);
	if (compileResult.errors.length > 0) {
		diagnosticsElement.innerHTML = compileResult.errors
			.map(
				(diagnostic) =>
					`<span class="diagnostic-error">Line ${diagnostic.range.start.line}:${diagnostic.range.start.column} — ${escapeHtml(diagnostic.message)}</span>`,
			)
			.join("\n");
		statusElement.textContent = `${compileResult.errors.length} error(s)`;
		switchTab("diagnostics");
		return;
	}

	diagnosticsElement.innerHTML =
		'<span style="color: var(--pico-ins-color, green)">No errors</span>';
	statusElement.textContent = "Valid";
};

const runFormat = () => {
	const source = editor.state.doc.toString();
	const statusElement = document.querySelector("#status");
	if (!statusElement) return;

	const formatted = formatMorph(source);
	if (formatted === undefined) {
		statusElement.textContent = "Cannot format — errors";
		setTimeout(() => {
			statusElement.textContent = "Ready";
		}, 2000);
	} else {
		editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: formatted },
		});
		statusElement.textContent = "Formatted!";
		setTimeout(() => {
			statusElement.textContent = "Ready";
		}, 1500);
	}
};

const buildFileTree = (files: readonly GeneratedFile[]): FolderNode => {
	const root: FolderNode = {
		folders: new Map(),
		fileIndices: [],
		totalFiles: 0,
	};

	for (const [index, file] of files.entries()) {
		const parts = file.filename.split("/");
		let node = root;
		for (let index_ = 0; index_ < parts.length - 1; index_++) {
			const part = parts[index_];
			if (!part) continue;
			let next = node.folders.get(part);
			if (!next) {
				next = { folders: new Map(), fileIndices: [], totalFiles: 0 };
				node.folders.set(part, next);
			}
			node = next;
		}
		node.fileIndices.push(index);
	}

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
		const nameA = files[a]?.filename.split("/").pop() ?? "";
		const nameB = files[b]?.filename.split("/").pop() ?? "";
		return nameA.localeCompare(nameB);
	});
	for (const index of sortedFiles) {
		const file = files[index];
		if (!file) continue;
		const fileName = file.filename.split("/").pop() ?? "";
		html += `<div class="file-tree-item" style="padding-left: ${indent + 16}px" data-index="${index}">${escapeHtml(fileName)}</div>`;
	}

	return html;
};

const renderFileTree = (
	files: readonly GeneratedFile[],
	treeElement: HTMLElement,
	contentElement: HTMLElement,
	summaryElement: HTMLElement | undefined,
) => {
	const filenameElement = document.querySelector("#generated-filename");

	if (files.length === 0) {
		treeElement.innerHTML =
			'<span class="diagnostic-warning">No files generated</span>';
		contentElement.textContent = "";
		if (summaryElement) summaryElement.textContent = "";
		if (filenameElement) filenameElement.textContent = "";
		return;
	}

	const tree = buildFileTree(files);
	const folderCount = countFolders(tree);

	if (summaryElement) {
		summaryElement.textContent = `${files.length} files generated across ${folderCount} directories`;
	}

	treeElement.innerHTML = renderFolderHtml(tree, files, 0);
	contentElement.textContent = "";
	if (filenameElement) filenameElement.textContent = "";

	const selectFile = (item: HTMLElement) => {
		for (const element of treeElement.querySelectorAll(".file-tree-item"))
			element.classList.remove("selected");
		item.classList.add("selected");
		const index = Number.parseInt(item.dataset["index"] ?? "0", 10);
		contentElement.textContent = files[index]?.content ?? "";
		if (filenameElement)
			filenameElement.textContent = files[index]?.filename ?? "";
	};

	for (const header of treeElement.querySelectorAll<HTMLElement>(
		".folder-header",
	)) {
		header.addEventListener("click", () => {
			const expanded = header.dataset["expanded"] === "true";
			header.dataset["expanded"] = expanded ? "false" : "true";
			const toggle = header.querySelector(".folder-toggle");
			if (toggle) toggle.textContent = expanded ? "▸" : "▾";
			const children = header.nextElementSibling;
			if (children) (children as HTMLElement).hidden = expanded;
		});
	}

	for (const item of treeElement.querySelectorAll<HTMLElement>(
		".file-tree-item",
	)) {
		item.addEventListener("click", () => selectFile(item));
	}
};

const runGenerate = () => {
	const source = editor.state.doc.toString();
	const treeElement = document.querySelector<HTMLElement>("#generated-tree");
	const contentElement =
		document.querySelector<HTMLElement>("#generated-content");
	const summaryElement =
		document.querySelector<HTMLElement>("#generated-summary");
	const statusElement = document.querySelector("#status");
	if (!treeElement || !contentElement) return;

	const diagnosticsElement = document.querySelector("#diagnostics-output");

	const parseResult = parse(source);
	if (!parseResult.ast || parseResult.errors.length > 0) {
		if (diagnosticsElement) {
			diagnosticsElement.innerHTML =
				'<span class="diagnostic-error">Fix errors before generating</span>';
		}
		switchTab("diagnostics");
		return;
	}

	const compileResult = compile(parseResult.ast);
	if (!compileResult.schema || compileResult.errors.length > 0) {
		if (diagnosticsElement) {
			diagnosticsElement.innerHTML =
				'<span class="diagnostic-error">Compilation errors — cannot generate</span>';
		}
		switchTab("diagnostics");
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
			treeElement,
			contentElement,
			summaryElement ?? undefined,
		);
		switchTab("generated");
		if (statusElement) {
			statusElement.textContent = `Generated ${result.files.length} files`;
			setTimeout(() => {
				statusElement.textContent = "Ready";
			}, 3000);
		}
	} catch (error) {
		if (diagnosticsElement) {
			diagnosticsElement.innerHTML = `<span class="diagnostic-error">Generation failed: ${escapeHtml(error instanceof Error ? error.message : String(error))}</span>`;
		}
		switchTab("diagnostics");
		if (statusElement) statusElement.textContent = "Ready";
	}
};

const switchTab = (tabName: string) => {
	for (const button of document.querySelectorAll<HTMLButtonElement>(
		".output-tabs button",
	)) {
		button.setAttribute(
			"aria-selected",
			button.dataset["tab"] === tabName ? "true" : "false",
		);
	}
	for (const panel of document.querySelectorAll(".tab-panel")) {
		panel.classList.toggle("active", panel.id === `tab-${tabName}`);
	}
};

const escapeHtml = (s: string): string =>
	s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

document.addEventListener("DOMContentLoaded", () => {
	initEditor();

	const treeElement = document.querySelector("#generated-tree");
	if (treeElement) {
		treeElement.innerHTML =
			"<p>Click <strong>Generate</strong> to see output.</p>";
	}

	document.querySelector("#btn-format")?.addEventListener("click", runFormat);
	document
		.querySelector("#btn-generate")
		?.addEventListener("click", runGenerate);
	document.querySelector("#btn-template")?.addEventListener("click", () => {
		editor.dispatch({
			changes: {
				from: 0,
				to: editor.state.doc.length,
				insert: TEMPLATE,
			},
		});
		runGenerate();
	});
	document.querySelector("#btn-share")?.addEventListener("click", () => {
		const source = editor.state.doc.toString();
		location.hash = encodeURIComponent(source);
		void navigator.clipboard.writeText(location.href);
		const statusElement = document.querySelector("#status");
		if (statusElement) {
			statusElement.textContent = "URL copied!";
			setTimeout(() => {
				statusElement.textContent = "Ready";
			}, 2000);
		}
	});

	for (const button of document.querySelectorAll<HTMLButtonElement>(
		".output-tabs button",
	)) {
		button.addEventListener("click", () => {
			switchTab(button.dataset["tab"] ?? "diagnostics");
		});
	}
});
