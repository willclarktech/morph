import type { GeneratedFile } from "@morphdsl/domain-schema";
import type { GeneratorPlugin, PluginContext } from "@morphdsl/plugin";

import { getPackageScope } from "@morphdsl/plugin";
import { buildConfigFiles } from "@morphdsl/builder-app";
import { generate as generateProto } from "@morphdsl/runtime-proto";

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
		const scope = getPackageScope(schema, name);
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
			...buildConfigFiles({ packagePath, name, npmScope: schema.npmScope }),
		];
	},
};
