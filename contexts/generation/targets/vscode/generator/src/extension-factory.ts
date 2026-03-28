import type { Effect, ManagedRuntime as MRT } from "effect";
import type { Layer } from "effect/Layer";

import { isOperation } from "@morph/operation";
import { Cause, Exit, ManagedRuntime } from "effect";

interface VsCodeOp {
	readonly name: string;
	readonly execute: (
		params: unknown,
		options: unknown,
	) => Effect.Effect<unknown, unknown, unknown>;
}

export interface ExtensionConfig<R> {
	readonly languageId: string;
	readonly extensions: readonly string[];
	readonly grammar: object;
	readonly languageConfig: object;
	readonly ops: Record<string, unknown>;
	readonly layer: Layer<R>;
	readonly diagnosticsDebounceMs?: number;
}

interface VsCode {
	readonly commands: {
		registerCommand: (
			command: string,
			callback: (...args: unknown[]) => unknown,
		) => Disposable;
	};
	readonly languages: {
		createDiagnosticCollection: (name: string) => DiagnosticCollection;
		registerCompletionItemProvider: (
			selector: DocumentSelector,
			provider: CompletionItemProvider,
			...triggerChars: string[]
		) => Disposable;
		registerDefinitionProvider: (
			selector: DocumentSelector,
			provider: DefinitionProvider,
		) => Disposable;
		registerDocumentFormattingEditProvider: (
			selector: DocumentSelector,
			provider: DocumentFormattingEditProvider,
		) => Disposable;
		registerDocumentSymbolProvider: (
			selector: DocumentSelector,
			provider: DocumentSymbolProvider,
		) => Disposable;
		registerFoldingRangeProvider: (
			selector: DocumentSelector,
			provider: FoldingRangeProvider,
		) => Disposable;
		registerHoverProvider: (
			selector: DocumentSelector,
			provider: HoverProvider,
		) => Disposable;
	};
	readonly window: {
		showInformationMessage: (message: string) => void;
		showTextDocument: (document: TextDocument) => Promise<void>;
	};
	readonly workspace: {
		onDidChangeTextDocument: (
			listener: (event: TextDocumentChangeEvent) => void,
		) => Disposable;
		onDidCloseTextDocument: (
			listener: (event: TextDocument) => void,
		) => Disposable;
		onDidOpenTextDocument: (
			listener: (event: TextDocument) => void,
		) => Disposable;
		openTextDocument: (options: {
			content: string;
			language?: string;
		}) => Promise<TextDocument>;
	};
	readonly DiagnosticSeverity: { Error: number; Warning: number };
	readonly Diagnostic: new (
		range: Range,
		message: string,
		severity: number,
	) => Diagnostic;
	readonly Range: new (
		startLine: number,
		startChar: number,
		endLine: number,
		endChar: number,
	) => Range;
	readonly Position: new (line: number, character: number) => Position;
	readonly DocumentSymbol: new (
		name: string,
		detail: string,
		kind: number,
		range: Range,
		selectionRange: Range,
	) => DocumentSymbol & { children: DocumentSymbol[] };
	readonly SymbolKind: Record<string, number>;
	readonly CompletionItem: new (label: string, kind: number) => CompletionItem;
	readonly CompletionItemKind: Record<string, number>;
	readonly Hover: new (contents: MarkdownString, range?: Range) => Hover;
	readonly MarkdownString: new (value: string) => MarkdownString;
	readonly Location: new (uri: Uri, range: Range) => Location;
	readonly TextEdit: {
		replace: (range: Range, newText: string) => TextEdit;
	};
	readonly FoldingRange: new (
		start: number,
		end: number,
		kind?: number,
	) => FoldingRange;
	readonly Uri: { file: (path: string) => Uri };
}

interface Disposable {
	dispose: () => void;
}
interface ExtensionContext {
	subscriptions: Disposable[];
}
interface TextDocument {
	languageId: string;
	uri: Uri;
	getText: () => string;
}
interface TextDocumentChangeEvent {
	document: TextDocument;
}
type DocumentSelector = string;
interface Range {
	start: Position;
	end: Position;
}
interface Position {
	line: number;
	character: number;
}
interface Uri {
	fsPath: string;
}
interface DiagnosticCollection extends Disposable {
	set: (uri: Uri, diagnostics: Diagnostic[]) => void;
	delete: (uri: Uri) => void;
}
interface Diagnostic {
	message: string;
}
interface DocumentSymbol {
	children: DocumentSymbol[];
}
interface DocumentSymbolProvider {
	provideDocumentSymbols: (document: TextDocument) => Promise<DocumentSymbol[]>;
}
interface CompletionItem {
	detail?: string;
}
interface CompletionItemProvider {
	provideCompletionItems: (
		document: TextDocument,
		position: Position,
	) => Promise<CompletionItem[]>;
}
interface MarkdownString {
	value: string;
}
interface Hover {
	contents: MarkdownString;
}
interface HoverProvider {
	provideHover: (
		document: TextDocument,
		position: Position,
	) => Promise<Hover | undefined>;
}
interface Location {
	uri: Uri;
	range: Range;
}
interface DefinitionProvider {
	provideDefinition: (
		document: TextDocument,
		position: Position,
	) => Promise<Location | undefined>;
}
interface TextEdit {
	range: Range;
	newText: string;
}
interface DocumentFormattingEditProvider {
	provideDocumentFormattingEdits: (
		document: TextDocument,
	) => Promise<TextEdit[]>;
}
interface FoldingRange {
	start: number;
	end: number;
}
interface FoldingRangeProvider {
	provideFoldingRanges: (document: TextDocument) => Promise<FoldingRange[]>;
}

interface DslDiagnostic {
	readonly message: string;
	readonly severity: "error" | "warning";
	readonly line: number;
	readonly column: number;
	readonly endLine: number;
	readonly endColumn: number;
}

interface DslSymbol {
	readonly name: string;
	readonly kind: string;
	readonly range: DslRange;
	readonly children: readonly DslSymbol[];
}

interface DslRange {
	readonly startLine: number;
	readonly startColumn: number;
	readonly endLine: number;
	readonly endColumn: number;
}

interface DslCompletion {
	readonly label: string;
	readonly kind: string;
	readonly detail?: string;
}

interface DslHoverResult {
	readonly content: string;
	readonly range?: DslRange;
}

interface DslLocation {
	readonly range: DslRange;
}

interface DslFoldingRange {
	readonly startLine: number;
	readonly endLine: number;
}

const SYMBOL_KIND_MAP: Record<string, string> = {
	domain: "Module",
	context: "Namespace",
	entity: "Class",
	value: "Struct",
	command: "Function",
	query: "Function",
	function: "Function",
	invariant: "Property",
	subscriber: "Event",
	port: "Interface",
	error: "Enum",
	type: "TypeParameter",
	attribute: "Field",
	extensions: "Object",
};

const KNOWN_PROVIDERS = new Set([
	"formatDsl",
	"getCompletions",
	"getDefinition",
	"getDiagnostics",
	"getFoldingRanges",
	"getHover",
	"getSymbols",
]);

const COMPLETION_KIND_MAP: Record<string, string> = {
	keyword: "Keyword",
	type: "Class",
	entity: "Class",
	tag: "Constant",
	snippet: "Snippet",
};

export const createExtension = <R>(config: ExtensionConfig<R>) => {
	const runOp = async <T>(
		runtime: MRT.ManagedRuntime<R, never>,
		op: VsCodeOp,
		params: unknown,
	): Promise<T | undefined> => {
		const exit = await runtime.runPromiseExit(
			op.execute(params, {}) as Effect.Effect<T, unknown, R>,
		);
		if (Exit.isSuccess(exit)) return exit.value;
		console.error(`[morph] ${op.name} failed:`, Cause.squash(exit.cause));
		return undefined;
	};

	const opMap = new Map<string, VsCodeOp>();
	for (const [, value] of Object.entries(config.ops)) {
		if (isOperation(value)) {
			opMap.set((value as VsCodeOp).name, value as VsCodeOp);
		}
	}

	let runtime: MRT.ManagedRuntime<R, never> | undefined;

	const activate = (context: ExtensionContext, vscode: VsCode) => {
		runtime = ManagedRuntime.make(config.layer);
		const selector: DocumentSelector = config.languageId;

		const getDiagnosticsOp = opMap.get("getDiagnostics");
		if (getDiagnosticsOp) {
			const diagnostics = vscode.languages.createDiagnosticCollection("morph");
			context.subscriptions.push(diagnostics);

			let debounceTimer: ReturnType<typeof setTimeout> | undefined;
			const debounceMs = config.diagnosticsDebounceMs ?? 150;

			const updateDiagnostics = (document: TextDocument) => {
				if (document.languageId !== config.languageId) return;
				if (debounceTimer) clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					if (!runtime) return;
					void runOp<readonly DslDiagnostic[]>(runtime, getDiagnosticsOp, {
						source: document.getText(),
					}).then((result) => {
						if (!result) {
							diagnostics.set(document.uri, []);
							return undefined;
						}
						diagnostics.set(
							document.uri,
							result.map(
								(d) =>
									new vscode.Diagnostic(
										new vscode.Range(
											d.line - 1,
											d.column - 1,
											d.endLine - 1,
											d.endColumn - 1,
										),
										d.message,
										d.severity === "error"
											? vscode.DiagnosticSeverity.Error
											: vscode.DiagnosticSeverity.Warning,
									),
							),
						);
						return undefined;
					});
				}, debounceMs);
			};

			context.subscriptions.push(
				vscode.workspace.onDidChangeTextDocument((event) =>
					updateDiagnostics(event.document),
				),
			);
			context.subscriptions.push(
				vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
			);
			context.subscriptions.push(
				vscode.workspace.onDidCloseTextDocument((document) =>
					diagnostics.delete(document.uri),
				),
			);
		}

		const getSymbolsOp = opMap.get("getSymbols");
		if (getSymbolsOp) {
			const mapSymbol = (sym: DslSymbol): DocumentSymbol => {
				const kindName = SYMBOL_KIND_MAP[sym.kind] ?? "Variable";
				const kind = vscode.SymbolKind[kindName] ?? 12;
				const range = new vscode.Range(
					sym.range.startLine - 1,
					sym.range.startColumn - 1,
					sym.range.endLine - 1,
					sym.range.endColumn - 1,
				);
				const result = new vscode.DocumentSymbol(
					sym.name,
					sym.kind,
					kind,
					range,
					range,
				);
				result.children = sym.children.map(mapSymbol);
				return result;
			};

			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(selector, {
					provideDocumentSymbols: async (document) => {
						if (!runtime) return [];
						const result = await runOp<readonly DslSymbol[]>(
							runtime,
							getSymbolsOp,
							{ source: document.getText() },
						);
						return result?.map(mapSymbol) ?? [];
					},
				}),
			);
		}

		const getCompletionsOp = opMap.get("getCompletions");
		if (getCompletionsOp) {
			context.subscriptions.push(
				vscode.languages.registerCompletionItemProvider(
					selector,
					{
						provideCompletionItems: async (document, position) => {
							if (!runtime) return [];
							const result = await runOp<readonly DslCompletion[]>(
								runtime,
								getCompletionsOp,
								{
									source: document.getText(),
									line: position.line + 1,
									column: position.character + 1,
								},
							);
							if (!result) return [];
							return result.map((c) => {
								const kindName = COMPLETION_KIND_MAP[c.kind] ?? "Text";
								const kind = vscode.CompletionItemKind[kindName] ?? 0;
								const item = new vscode.CompletionItem(c.label, kind);
								if (c.detail) item.detail = c.detail;
								return item;
							});
						},
					},
					"@",
					":",
				),
			);
		}

		const getHoverOp = opMap.get("getHover");
		if (getHoverOp) {
			context.subscriptions.push(
				vscode.languages.registerHoverProvider(selector, {
					provideHover: async (document, position) => {
						if (!runtime) return undefined;
						const result = await runOp<DslHoverResult>(runtime, getHoverOp, {
							source: document.getText(),
							line: position.line + 1,
							column: position.character + 1,
						});
						if (!result?.content) return undefined;
						const md = new vscode.MarkdownString(result.content);
						if (result.range) {
							return new vscode.Hover(
								md,
								new vscode.Range(
									result.range.startLine - 1,
									result.range.startColumn - 1,
									result.range.endLine - 1,
									result.range.endColumn - 1,
								),
							);
						}
						return new vscode.Hover(md);
					},
				}),
			);
		}

		const getDefinitionOp = opMap.get("getDefinition");
		if (getDefinitionOp) {
			context.subscriptions.push(
				vscode.languages.registerDefinitionProvider(selector, {
					provideDefinition: async (document, position) => {
						if (!runtime) return undefined;
						const result = await runOp<DslLocation>(runtime, getDefinitionOp, {
							source: document.getText(),
							line: position.line + 1,
							column: position.character + 1,
						});
						if (
							!result?.range ||
							(result.range.startLine === 0 && result.range.startColumn === 0)
						)
							return undefined;
						return new vscode.Location(
							document.uri,
							new vscode.Range(
								result.range.startLine - 1,
								result.range.startColumn - 1,
								result.range.endLine - 1,
								result.range.endColumn - 1,
							),
						);
					},
				}),
			);
		}

		const formatDslOp = opMap.get("formatDsl");
		if (formatDslOp) {
			context.subscriptions.push(
				vscode.languages.registerDocumentFormattingEditProvider(selector, {
					provideDocumentFormattingEdits: async (document) => {
						if (!runtime) return [];
						const result = await runOp<string>(runtime, formatDslOp, {
							source: document.getText(),
						});
						if (!result) return [];
						const fullRange = new vscode.Range(
							0,
							0,
							document.getText().split("\n").length,
							0,
						);
						return [vscode.TextEdit.replace(fullRange, result)];
					},
				}),
			);
		}

		const getFoldingRangesOp = opMap.get("getFoldingRanges");
		if (getFoldingRangesOp) {
			context.subscriptions.push(
				vscode.languages.registerFoldingRangeProvider(selector, {
					provideFoldingRanges: async (document) => {
						if (!runtime) return [];
						const result = await runOp<readonly DslFoldingRange[]>(
							runtime,
							getFoldingRangesOp,
							{ source: document.getText() },
						);
						if (!result) return [];
						return result.map(
							(r) => new vscode.FoldingRange(r.startLine - 1, r.endLine - 1),
						);
					},
				}),
			);
		}

		for (const [name, op] of opMap) {
			if (KNOWN_PROVIDERS.has(name)) continue;
			const commandId = `morph.${name}`;
			context.subscriptions.push(
				vscode.commands.registerCommand(commandId, async () => {
					if (!runtime) return;
					const result = await runOp<unknown>(runtime, op, {});
					if (typeof result === "string") {
						const document = await vscode.workspace.openTextDocument({
							content: result,
							language: config.languageId,
						});
						await vscode.window.showTextDocument(document);
					} else {
						vscode.window.showInformationMessage(`${name} completed`);
					}
				}),
			);
		}
	};

	const deactivate = async () => {
		if (runtime) {
			await runtime.dispose();
			runtime = undefined;
		}
	};

	return { activate, deactivate };
};
