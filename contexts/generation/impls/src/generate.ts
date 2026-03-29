import type {
	DomainSchema,
	GeneratedFile,
	TextConfig,
} from "@morphdsl/domain-schema";
import type { InvalidSchemaError } from "@morphdsl/generation-dsl";
import type { UiConfig } from "@morphdsl/runtime-ui";
import type { Effect } from "effect";

import { analyzeSchemaFeatures } from "@morphdsl/builder-app";
import { runPlugins } from "@morphdsl/plugin";
import { apiPlugin } from "@morphdsl/plugin-api";
import { cliPlugin } from "@morphdsl/plugin-cli";
import { cliClientPlugin } from "@morphdsl/plugin-cli-client";
import { clientPlugin } from "@morphdsl/plugin-client";
import { corePlugin } from "@morphdsl/plugin-core";
import { dslPlugin } from "@morphdsl/plugin-dsl";
import { mcpPlugin } from "@morphdsl/plugin-mcp";
import { monorepoRootPlugin } from "@morphdsl/plugin-monorepo-root";
import { protoPlugin } from "@morphdsl/plugin-proto";
import { uiPlugin } from "@morphdsl/plugin-ui";
import { verificationPlugin } from "@morphdsl/plugin-verification";
import { vsCodePlugin } from "@morphdsl/plugin-vscode";
import { Context, Effect as E, Layer } from "effect";

import { parseSchemaInput } from "./utils";

export { generate as generateEnvironmentExample } from "@morphdsl/generator-env";
export { schemaHasTag } from "@morphdsl/plugin";

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
	"@morphdsl/impls/GenerateHandler",
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
