import { createExtension } from "@morph/generator-vscode";
import { HandlersLayer, ops } from "@morph/schema-dsl-core";
import { textMateGrammar, languageConfiguration } from "@morph/schema-dsl-core";
import * as vscode from "vscode";

const extension = createExtension({
	languageId: "morph",
	extensions: [".morph"],
	grammar: textMateGrammar,
	languageConfig: languageConfiguration,
	ops,
	layer: HandlersLayer,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vscode types are structurally richer than runtime stubs
export const activate = (context: vscode.ExtensionContext) =>
	extension.activate(context as any, vscode as any);

export const deactivate = () => extension.deactivate();
