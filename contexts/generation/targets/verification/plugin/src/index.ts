import type { GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import { buildConfigFiles, buildPackageJson } from "@morph/builder-app";
import { generate } from "@morph/generator-verification";

const PACKAGE_PATH = "tests/verification";

const generateVerificationPackageJson = (name: string): string =>
	buildPackageJson({
		projectName: name,
		packageSuffix: "verification",
		scripts: {
			verify: "bun run src/verify.ts",
		},
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
				content: generateVerificationPackageJson(ctx.name),
				filename: `${PACKAGE_PATH}/package.json`,
			},
			...buildConfigFiles(PACKAGE_PATH, ctx.name),
			...coreFiles,
		];
	},
};
