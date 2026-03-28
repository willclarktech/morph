import type {
	DomainSchema,
	GeneratedFile,
	TextConfig,
} from "@morph/domain-schema";
import type { InvalidSchemaError } from "@morph/generation-dsl";
import type { UiConfig } from "@morph/runtime-ui";
import type { Effect } from "effect";

import { analyzeSchemaFeatures } from "@morph/builder-app";
import { runPlugins } from "@morph/plugin";
import { apiPlugin } from "@morph/plugin-api";
import { cliPlugin } from "@morph/plugin-cli";
import { cliClientPlugin } from "@morph/plugin-cli-client";
import { clientPlugin } from "@morph/plugin-client";
import { corePlugin } from "@morph/plugin-core";
import { dslPlugin } from "@morph/plugin-dsl";
import { mcpPlugin } from "@morph/plugin-mcp";
import { monorepoRootPlugin } from "@morph/plugin-monorepo-root";
import { protoPlugin } from "@morph/plugin-proto";
import { uiPlugin } from "@morph/plugin-ui";
import { verificationPlugin } from "@morph/plugin-verification";
import { vsCodePlugin } from "@morph/plugin-vscode";
import { Context, Effect as E, Layer } from "effect";

import { parseSchemaInput } from "./utils";

export { generate as generateEnvironmentExample } from "@morph/generator-env";
export { schemaHasTag } from "@morph/plugin";

export interface GenerateOptions {
	readonly textConfig?: TextConfig | undefined;
	readonly uiConfig?: UiConfig | undefined;
}

export interface GenerateHandler {
	readonly handle: (
		params: { readonly name: string; readonly schema: string },
		options: GenerateOptions,
	) => Effect.Effect<{ files: GeneratedFile[] }, InvalidSchemaError>;
}

export const GenerateHandler = Context.GenericTag<GenerateHandler>(
	"@morph/impls/GenerateHandler",
);

const plugins = [
	dslPlugin,
	corePlugin,
	protoPlugin,
	apiPlugin,
	clientPlugin,
	cliPlugin,
	cliClientPlugin,
	mcpPlugin,
	uiPlugin,
	vsCodePlugin,
	monorepoRootPlugin,
	verificationPlugin,
];

export const executeGenerate = (
	schema: DomainSchema,
	name: string,
	options?: GenerateOptions,
): Effect.Effect<{ files: GeneratedFile[] }> =>
	E.succeed({
		files: runPlugins(plugins, {
			schema,
			name,
			features: analyzeSchemaFeatures(schema),
			config: {
				textConfig: options?.textConfig,
				uiConfig: options?.uiConfig,
			},
		}),
	});

export const GenerateHandlerLive = Layer.succeed(GenerateHandler, {
	handle: (params, options) =>
		E.gen(function* () {
			const schema = yield* parseSchemaInput(params.schema);
			return yield* executeGenerate(schema, params.name, options);
		}),
});
