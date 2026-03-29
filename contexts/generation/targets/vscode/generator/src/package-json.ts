import type { PackageMetadata } from "@morphdsl/builder-app";

import { orderedPackageJson, toPackageScope } from "@morphdsl/builder-app";

import type { ContextPackages } from "./generate";

export interface CommandOp {
	readonly name: string;
	readonly description: string;
}

export interface VsCodePackageJsonOptions {
	readonly name: string;
	readonly displayName: string;
	readonly contexts: readonly ContextPackages[];
	readonly commandOps?: readonly CommandOp[] | undefined;
	readonly metadata?: PackageMetadata;
}

const toTitleCase = (camelCase: string): string =>
	camelCase
		.replaceAll(/([A-Z])/g, " $1")
		.replace(/^./, (c) => c.toUpperCase())
		.trim();

export const generateVsCodePackageJson = (
	options: VsCodePackageJsonOptions,
): string => {
	const { name, displayName, contexts, commandOps, metadata } = options;
	const scope = toPackageScope(name, metadata?.npmScope);

	const contextDeps: Record<string, string> = {};
	for (const context of contexts) {
		contextDeps[context.corePackage] = "workspace:*";
	}

	const lowerName = name.toLowerCase();

	const contributes: Record<string, unknown> = {
		languages: [
			{
				id: "morph",
				aliases: ["Morph DSL", "morph"],
				extensions: [".morph"],
				configuration: "./language-configuration.json",
			},
		],
		grammars: [
			{
				language: "morph",
				scopeName: "source.morph",
				path: "./syntaxes/morph.tmLanguage.json",
			},
		],
	};

	if (commandOps && commandOps.length > 0) {
		contributes["commands"] = commandOps.map((op) => ({
			command: `morph.${op.name}`,
			title: `Morph: ${toTitleCase(op.name)}`,
		}));
	}

	const package_ = {
		name: `${lowerName}-dsl-vscode`,
		displayName,
		description: `VSCode language support for ${displayName}`,
		version: "0.0.0",
		...(metadata?.license ? { license: metadata.license } : {}),
		...(metadata?.author ? { author: metadata.author } : {}),
		...(metadata?.repository
			? {
					repository: {
						type: "git",
						url: metadata.repository,
						directory: "apps/vscode",
					},
				}
			: {}),
		publisher: lowerName,
		icon: "icon.png",
		engines: {
			vscode: "^1.96.0",
		},
		categories: ["Programming Languages"],
		main: "./dist/extension.js",
		activationEvents: ["onLanguage:morph"],
		contributes,
		scripts: {
			"build:check": "tsc --noEmit",
			build: "bun esbuild.config.ts",
			package:
				"bun run build && bunx @vscode/vsce package --no-dependencies --skip-license",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
		},
		dependencies: {
			"@morphdsl/generator-vscode": "workspace:*",
			...contextDeps,
			effect: "^3.19.13",
		},
		devDependencies: {
			[`@${scope}/eslint-config`]: "workspace:*",
			[`@${scope}/tsconfig`]: "workspace:*",
			"@types/vscode": "^1.96.0",
			"@vscode/vsce": "^3.0.0",
			esbuild: "^0.25.0",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
	};

	return JSON.stringify(orderedPackageJson(package_), undefined, "\t") + "\n";
};
