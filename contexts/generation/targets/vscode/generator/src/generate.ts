import type { GeneratedFile } from "@morph/domain-schema";

import { sortImports, toPascalCase } from "@morph/utils";

export interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

export interface GenerateVsCodeAppOptions {
	readonly contexts: readonly ContextPackages[];
	readonly name: string;
	readonly packageDir?: string;
}

export const generate = (
	options: GenerateVsCodeAppOptions,
): { files: readonly GeneratedFile[] } => {
	const packageDir = options.packageDir ?? "apps/vscode";
	const contexts = options.contexts;
	const isMultiContext = contexts.length > 1;

	const contextImports = contexts
		.map((ctx) => {
			const pascal = toPascalCase(ctx.contextName);
			if (isMultiContext) {
				return `import { HandlersLayer as ${pascal}HandlersLayer, ops as ${pascal}Ops } from "${ctx.corePackage}";
import { textMateGrammar as ${pascal}Grammar, languageConfiguration as ${pascal}LangConfig } from "${ctx.corePackage}";`;
			}
			return `import { HandlersLayer, ops } from "${ctx.corePackage}";
import { textMateGrammar, languageConfiguration } from "${ctx.corePackage}";`;
		})
		.join("\n");

	const layerMerge = isMultiContext
		? `const HandlersLayer = Layer.mergeAll(${contexts.map((ctx) => `${toPascalCase(ctx.contextName)}HandlersLayer`).join(", ")});`
		: "";

	const opsMerge = isMultiContext
		? `const ops = {\n${contexts.map((ctx) => `\t...${toPascalCase(ctx.contextName)}Ops,`).join("\n")}\n};`
		: "";

	const grammarRef = isMultiContext
		? `${toPascalCase(contexts[0]!.contextName)}Grammar`
		: "textMateGrammar";
	const langConfigRef = isMultiContext
		? `${toPascalCase(contexts[0]!.contextName)}LangConfig`
		: "languageConfiguration";

	const importBlock = sortImports(
		[
			`import * as vscode from "vscode";`,
			`import { createExtension } from "@morph/generator-vscode";`,
			contextImports,
			...(isMultiContext ? [`import { Layer } from "effect";`] : []),
		].join("\n"),
	);

	const content = `${importBlock}
${layerMerge ? `\n${layerMerge}\n` : ""}${opsMerge ? `${opsMerge}\n` : ""}
const extension = createExtension({
	languageId: "morph",
	extensions: [".morph"],
	grammar: ${grammarRef},
	languageConfig: ${langConfigRef},
	ops,
	layer: HandlersLayer,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vscode types are structurally richer than runtime stubs
export const activate = (context: vscode.ExtensionContext) =>
	extension.activate(context as any, vscode as any);

export const deactivate = () => extension.deactivate();
`;

	return {
		files: [
			{
				content,
				filename: `${packageDir}/src/extension.ts`,
			},
		],
	};
};
