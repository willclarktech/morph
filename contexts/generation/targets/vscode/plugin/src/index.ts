import type { ContextDef, GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";
import type { CommandOp } from "@morphdsl/generator-vscode";

import { getContextsWithTag } from "@morphdsl/domain-schema";
import { getPackageScope } from "@morphdsl/plugin";
import { buildConfigFiles } from "@morphdsl/builder-app";
import {
	generate as generateVsCodeAppEntry,
	generateVsCodePackageJson,
} from "@morphdsl/generator-vscode";
import { toKebabCase, toPascalCase } from "@morphdsl/utils";

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
		...Object.entries(context.commands),
		...Object.entries(context.queries),
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
	loader: { ".morph": "text" },
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

const generateTsConfig = (scope: string): string => {
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
		const scope = getPackageScope(schema, name);

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
				commandOps,
				contexts,
				displayName,
				metadata: schema,
				name,
			}),
			filename: `${packagePath}/package.json`,
		});

		const configFiles = buildConfigFiles({ packagePath, name, npmScope: schema.npmScope });
		for (const f of configFiles) {
			if (f.filename.endsWith("eslint.config.ts")) {
				files.push({
					...f,
					content: `import { configs } from "@${scope}/eslint-config";

export default [
\t{ ignores: ["**/*.template.ts", "dist/**"] },
\t...configs.generated,
];
`,
				});
			} else {
				files.push(f);
			}
		}

		files.push({
			content: generateTsConfig(scope),
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

		files.push({
			content: "dist\n",
			filename: `${packagePath}/.prettierignore`,
		});

		return files;
	},
};
