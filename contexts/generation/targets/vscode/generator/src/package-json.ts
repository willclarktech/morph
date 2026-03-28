import type { ContextPackages } from "./generate";

const sortObjectKeys = <T extends Record<string, unknown>>(input: T): T => {
	if (Array.isArray(input)) return input as T;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		sorted[key] =
			typeof value === "object" && value !== null && !Array.isArray(value)
				? sortObjectKeys(value as Record<string, unknown>)
				: value;
	}
	return sorted as T;
};

export interface CommandOp {
	readonly name: string;
	readonly description: string;
}

export interface VsCodePackageJsonOptions {
	readonly name: string;
	readonly displayName: string;
	readonly contexts: readonly ContextPackages[];
	readonly commandOps?: readonly CommandOp[] | undefined;
}

const toTitleCase = (camelCase: string): string =>
	camelCase
		.replaceAll(/([A-Z])/g, " $1")
		.replace(/^./, (c) => c.toUpperCase())
		.trim();

export const generateVsCodePackageJson = (
	options: VsCodePackageJsonOptions,
): string => {
	const { name, displayName, contexts, commandOps } = options;

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
		publisher: lowerName,
		private: true,
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
			"vscode:prepublish": "bun esbuild.config.ts",
			package: "bunx @vscode/vsce package --no-dependencies",
			format: "prettier --check .",
			"format:fix": "prettier --write .",
			lint: "eslint .",
			"lint:fix": "eslint . --fix",
		},
		dependencies: {
			"@morph/generator-vscode": "workspace:*",
			...contextDeps,
			effect: "^3.19.13",
		},
		devDependencies: {
			[`@${name}/eslint-config`]: "workspace:*",
			[`@${name}/tsconfig`]: "workspace:*",
			"@types/vscode": "^1.96.0",
			"@vscode/vsce": "^3.0.0",
			esbuild: "^0.25.0",
			eslint: "^9.39.0",
			prettier: "^3.4.2",
			typescript: "^5.7.2",
		},
	};

	return JSON.stringify(sortObjectKeys(package_), undefined, "\t") + "\n";
};
