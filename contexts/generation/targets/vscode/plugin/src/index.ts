import type { ContextDef, GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";
import type { CommandOp } from "@morph/generator-vscode";

import { getContextsWithTag } from "@morph/domain-schema";
import { buildConfigFiles } from "@morph/builder-app";
import {
	generate as generateVsCodeAppEntry,
	generateVsCodePackageJson,
} from "@morph/generator-vscode";
import { toKebabCase, toPascalCase } from "@morph/utils";

interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

const KNOWN_PROVIDERS = new Set([
	"getDiagnostics",
	"getSymbols",
	"getCompletions",
	"getHover",
	"getDefinition",
	"formatDsl",
	"getFoldingRanges",
]);

const getCommandOps = (context: ContextDef): readonly CommandOp[] => {
	const ops = [
		...Object.entries(context.commands ?? {}),
		...Object.entries(context.queries ?? {}),
		...Object.entries(context.functions ?? {}),
	];
	return ops
		.filter(
			([name, op]) =>
				op.tags?.includes("@vscode") && !KNOWN_PROVIDERS.has(name),
		)
		.map(([name, op]) => ({ name, description: op.description }));
};

const generateEsbuildConfig = (): string => `import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["src/extension.ts"],
	bundle: true,
	outfile: "dist/extension.js",
	external: ["vscode"],
	format: "cjs",
	platform: "node",
	target: "node18",
	sourcemap: true,
	minify: true,
});

console.info("Build complete: dist/extension.js");
`;

const generateVsCodeIgnore = (): string => `node_modules/
src/
*.ts
!dist/**
tsconfig.json
eslint.config.ts
esbuild.config.ts
.env*
`;

const generateTsConfig = (name: string): string => {
	const scope = name.toLowerCase();
	return JSON.stringify(
		{
			extends: `@${scope}/tsconfig/base.json`,
			compilerOptions: {
				module: "ES2022",
				moduleResolution: "bundler",
				target: "ES2022",
				lib: ["ES2022"],
				outDir: "dist",
				types: ["vscode"],
			},
			include: ["src"],
		},
		undefined,
		"\t",
	) + "\n";
};

export const vsCodePlugin: GeneratorPlugin = {
	id: "app-vscode",
	kind: "app",
	tags: ["@vscode"],
	dependencies: ["lib-dsl", "lib-core"],
	metadata: {
		quickStartSteps: [
			{
				description: "Build the extension:",
				command: "cd apps/vscode && bun run build",
			},
			{
				description: "Package as .vsix:",
				command: "cd apps/vscode && bun run package",
			},
		],
		projectStructure: { path: "apps/vscode/", description: "VSCode extension" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = "apps/vscode";
		const scope = name.toLowerCase();

		const vsCodeContexts = getContextsWithTag(schema, "@vscode");

		const contexts: ContextPackages[] = vsCodeContexts.map((contextName) => {
			const contextKebab = toKebabCase(contextName);
			return {
				contextName,
				corePackage: `@${scope}/${contextKebab}-core`,
				dslPackage: `@${scope}/${contextKebab}-dsl`,
			};
		});

		if (contexts.length === 0) return [];

		const commandOps = vsCodeContexts.flatMap((contextName) => {
			const context = schema.contexts[contextName];
			return context ? getCommandOps(context) : [];
		});

		const displayName = `${toPascalCase(name)} DSL`;
		const files: GeneratedFile[] = [];

		files.push({
			content: generateVsCodePackageJson({
				contexts,
				name,
				displayName,
				commandOps,
			}),
			filename: `${packagePath}/package.json`,
		});

		const configFiles = buildConfigFiles(packagePath, name);
		files.push(...configFiles);

		files.push({
			content: generateTsConfig(name),
			filename: `${packagePath}/tsconfig.json`,
		});

		const appEntry = generateVsCodeAppEntry({
			contexts,
			name,
			packageDir: packagePath,
		});
		files.push(...appEntry.files);

		files.push({
			content: generateEsbuildConfig(),
			filename: `${packagePath}/esbuild.config.ts`,
		});

		files.push({
			content: generateVsCodeIgnore(),
			filename: `${packagePath}/.vscodeignore`,
		});

		return files;
	},
};
