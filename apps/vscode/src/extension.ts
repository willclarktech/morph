import { createExtension } from "@morphdsl/generator-vscode";
import {
	HandlersLayer,
	languageConfiguration,
	ops,
	textMateGrammar,
} from "@morphdsl/schema-dsl-core";
import * as vscode from "vscode";

const extension = createExtension({
	languageId: "morph",
	extensions: [".morph"],
	grammar: textMateGrammar,
	languageConfig: languageConfiguration,
	ops,
	layer: HandlersLayer,
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- vscode types are structurally richer than runtime stubs */
export const activate = (context: vscode.ExtensionContext) =>
	extension.activate(context as any, vscode as any);
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

export const deactivate = () => extension.deactivate();
