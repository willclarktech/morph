import type { GeneratedFile } from "@morphdsl/domain-schema";

import { sortImports, toPascalCase } from "@morphdsl/utils";

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
		.map((context) => {
			const pascal = toPascalCase(context.contextName);
			if (isMultiContext) {
				return `import {\n\tHandlersLayer as ${pascal}HandlersLayer,\n\tlanguageConfiguration as ${pascal}LangConfig,\n\tops as ${pascal}Ops,\n\ttextMateGrammar as ${pascal}Grammar,\n} from "${context.corePackage}";`;
			}
			return `import {\n\tHandlersLayer,\n\tlanguageConfiguration,\n\tops,\n\ttextMateGrammar,\n} from "${context.corePackage}";`;
		})
		.join("\n");

	const layerMerge = isMultiContext
		? `const HandlersLayer = Layer.mergeAll(${contexts.map((context) => `${toPascalCase(context.contextName)}HandlersLayer`).join(", ")});`
		: "";

	const opsMerge = isMultiContext
		? `const ops = {\n${contexts.map((context) => `\t...${toPascalCase(context.contextName)}Ops,`).join("\n")}\n};`
		: "";

	const [firstContext] = contexts;
	const grammarRef =
		isMultiContext && firstContext
			? `${toPascalCase(firstContext.contextName)}Grammar`
			: "textMateGrammar";
	const langConfigRef =
		isMultiContext && firstContext
			? `${toPascalCase(firstContext.contextName)}LangConfig`
			: "languageConfiguration";

	const importBlock = sortImports(
		[
			`import * as vscode from "vscode";`,
			`import { createExtension } from "@morphdsl/generator-vscode";`,
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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument -- vscode types are structurally richer than runtime stubs */
export const activate = (context: vscode.ExtensionContext) =>
	extension.activate(context, vscode as any);
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

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
