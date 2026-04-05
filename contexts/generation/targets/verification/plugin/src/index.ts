import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import { buildConfigFiles, buildPackageJson } from "@morphdsl/builder-app";
import { generate } from "@morphdsl/generator-verification";

const PACKAGE_PATH = "tests/verification";

const generateVerificationPackageJson = (name: string, npmScope?: string): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "verification",
		scripts: {
			verify: "bun run src/verify.ts",
		},
		...(npmScope ? { metadata: { npmScope } } : {}),
	});

export const verificationPlugin: GeneratorPlugin = {
	id: "test-verification",
	kind: "test-support",
	dependencies: ["lib-dsl"],
	metadata: {
		projectStructure: {
			path: "tests/verification/",
			description: "Formal verification checks (SMT-LIB2 + Z3)",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const coreFiles = generate(ctx.schema, ctx.name);
		if (coreFiles.length === 0) return [];

		return [
			{
				content: generateVerificationPackageJson(ctx.name, ctx.schema.npmScope),
				filename: `${PACKAGE_PATH}/package.json`,
			},
			...buildConfigFiles({ packagePath: PACKAGE_PATH, name: ctx.name, npmScope: ctx.schema.npmScope }),
			...coreFiles,
		];
	},
};
