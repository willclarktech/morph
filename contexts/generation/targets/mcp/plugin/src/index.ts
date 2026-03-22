import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import {
	findPrimaryContext,
	getContextsWithTag,
	schemaHasAuthRequirement,
} from "@morph/domain-schema";
import {
	buildConfigFiles,
	buildDockerfile,
	generateAppFiles,
} from "@morph/builder-app";
import { generate as generateEnvironmentExample } from "@morph/generator-env";
import {
	generate as generateMcpAppEntry,
	generateMcpPackageJson,
} from "@morph/runtime-mcp";
import { buildTokenAuthConfig } from "@morph/builder-test";
import { toEnvironmentPrefix, toKebabCase, toPascalCase } from "@morph/utils";

interface ContextPackages {
	readonly contextName: string;
	readonly corePackage: string;
	readonly dslPackage: string;
}

const generateMcpDockerfile = (name: string): string =>
	buildDockerfile({
		name,
		build: {
			libs: ["dsl", "core"],
			appDir: "mcp",
			extraFiles: ["schema.json"],
		},
		production: {
			baseImage: "oven/bun:1-alpine",
			workdir: "/app/apps/mcp",
			copyFrom: "full-app",
			cmd: ["bun", "start"],
		},
	});

const generateMcpScenarioTest = (
	schema: DomainSchema,
	name: string,
	scenariosPackage: string,
	contexts: readonly ContextPackages[],
): string => {
	const envPrefix = toEnvironmentPrefix(name);
	const hasAuth = schemaHasAuthRequirement(schema);
	const authConfig = buildTokenAuthConfig(hasAuth);

	// Generate imports for prose from each context's core package
	const proseImports = contexts
		.map((ctx) => {
			const alias = `${toPascalCase(ctx.contextName)}Prose`;
			return `import { prose as ${alias} } from "${ctx.corePackage}";`;
		})
		.join("\n");

	// Merge prose objects from all contexts
	const proseMerge =
		contexts.length === 1
			? `const prose = ${toPascalCase(contexts[0]!.contextName)}Prose;`
			: `const prose = {\n${contexts.map((ctx) => `\t...${toPascalCase(ctx.contextName)}Prose,`).join("\n")}\n};`;

	return `import { createMcpRunner } from "@morph/scenario-runner-mcp";
${proseImports}
import { scenarios } from "${scenariosPackage}";
import { expect, test } from "bun:test";
import path from "node:path";

${proseMerge}

// Resolve to package root (test file is in src/test/)
const cwd = path.resolve(import.meta.dir, "../..");

const runner = createMcpRunner({
	${authConfig}command: "bun src/index.ts",
	cwd,
	env: { ${envPrefix}_STORAGE: "memory" },
	prose,
	reset: "restart",
});

test("scenarios", async () => {
	const result = await runner.runAllAndPrint(scenarios);
	expect(result.failed).toBe(0);
});
`;
};

export const mcpPlugin: GeneratorPlugin = {
	id: "app-mcp",
	kind: "app",
	tags: ["@mcp"],
	dependencies: ["lib-dsl", "lib-core"],
	metadata: {
		quickStartSteps: [
			{ description: "Start the MCP server:", command: "bun run --filter @{name}/mcp start" },
		],
		projectStructure: { path: "apps/mcp/", description: "MCP server" },
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = `apps/mcp`;
		const scope = name.toLowerCase();

		// Find all contexts with @mcp-tagged operations
		const mcpContexts = getContextsWithTag(schema, "@mcp");
		const usePrefix = mcpContexts.length > 1;

		// Build context packages list
		const contexts: ContextPackages[] = mcpContexts.map((contextName) => {
			const contextKebab = toKebabCase(contextName);
			return {
				contextName,
				corePackage: `@${scope}/${contextKebab}-core`,
				dslPackage: `@${scope}/${contextKebab}-dsl`,
			};
		});

		// Fallback to first context with operations if no @mcp-tagged contexts
		if (contexts.length === 0) {
			const primaryContext = findPrimaryContext(schema);
			const contextKebab = toKebabCase(primaryContext ?? "app");
			contexts.push({
				contextName: primaryContext ?? "app",
				corePackage: `@${scope}/${contextKebab}-core`,
				dslPackage: `@${scope}/${contextKebab}-dsl`,
			});
		}

		const scenariosPackage = `@${scope}/scenarios`;
		const envPrefix = toEnvironmentPrefix(name);
		const { features } = ctx;
		const files: GeneratedFile[] = [];

		const appFiles = generateAppFiles({
			appType: "mcp",
			name,
			packagePath,
			generatePackageJson: () =>
				generateMcpPackageJson({
					contexts,
					name,
					scenariosPackage,
				}),
			generateConfigFiles: () => buildConfigFiles(packagePath, name),
			generateAppEntry: () =>
				generateMcpAppEntry({
					contexts,
					envPrefix,
					mcpName: name,
					packageDir: packagePath,
					schema,
					usePrefix,
				}),
			generateEnvExample: () =>
				generateEnvironmentExample(envPrefix, "mcp", features),
			generateDockerfile: () => generateMcpDockerfile(name),
		});
		files.push(...appFiles);

		files.push({
			content: generateMcpScenarioTest(
				schema,
				name,
				scenariosPackage,
				contexts,
			),
			filename: `${packagePath}/src/test/scenarios.test.ts`,
		});

		return files;
	},
};
