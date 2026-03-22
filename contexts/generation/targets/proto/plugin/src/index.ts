import type { GeneratedFile } from "@morph/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morph/plugin";

import { buildConfigFiles } from "@morph/builder-app";
import { generate as generateProto } from "@morph/runtime-proto";

export const protoPlugin: GeneratorPlugin = {
	id: "lib-proto",
	kind: "lib",
	tags: [],
	dependencies: ["lib-dsl"],
	metadata: {
		projectStructure: {
			path: "libs/proto/",
			description: "Protobuf message definitions and field mappings",
		},
	},

	generate(ctx: PluginContext): GeneratedFile[] {
		const { schema, name } = ctx;
		const packagePath = "libs/proto";
		const scope = name.toLowerCase();
		const encodingFormats = schema.extensions?.encoding?.formats ?? [];

		if (!encodingFormats.includes("protobuf")) {
			return [];
		}

		const result = generateProto({
			packageDir: packagePath,
			schema,
		});

		const packageJson = JSON.stringify(
			{
				name: `@${scope}/proto`,
				version: "0.0.0",
				private: true,
				type: "module",
				exports: { ".": "./src/index.ts" },
				dependencies: {
					protobufjs: "^7.4.0",
				},
			},
			undefined,
			"\t",
		);

		const indexContent = [
			'export * from "./date-fields";',
			'export * from "./proto-map";',
			"",
		].join("\n");

		return [
			...result.files,
			{ content: `${packageJson}\n`, filename: `${packagePath}/package.json` },
			{ content: indexContent, filename: `${packagePath}/src/index.ts` },
			...buildConfigFiles(packagePath, name),
		];
	},
};
