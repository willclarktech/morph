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
import { rewriteMorphdslDepsInPackage } from "@morphdsl/utils";
import { Context, Effect as E, Layer } from "effect";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseSchemaInput } from "./utils";

export { generate as generateEnvironmentExample } from "@morphdsl/generator-env";
export { schemaHasTag } from "@morphdsl/plugin";

export interface GenerateOptions {
	readonly textConfig?: TextConfig | undefined;
	readonly uiConfig?: UiConfig | undefined;
	/**
	 * If true, leave `workspace:*` references for `@morphdsl/*` deps in the
	 * generated package.json files untouched. Only morph's self-regeneration
	 * (`scripts/regenerate-morph.ts`) should set this — generated projects
	 * won't have a workspace to resolve those refs against.
	 */
	readonly preserveWorkspaceDeps?: boolean;
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
		files: postProcessFiles(
			runPlugins(plugins, {
				schema,
				name,
				features: analyzeSchemaFeatures(schema),
				config: {
					textConfig: options?.textConfig,
					uiConfig: options?.uiConfig,
				},
			}),
			options,
		),
	});

/**
 * Replace `workspace:*` references for `@morphdsl/*` deps with the
 * concrete morphdsl version in every package.json among the given files.
 * No-op when called with `preserveWorkspaceDeps: true`.
 *
 * Exported so callers like `NewProjectHandlerLive` can apply the rewrite
 * to the combined scaffold + generate output, not just the generate output.
 */
export const postProcessFiles = (
	files: GeneratedFile[],
	options: GenerateOptions | undefined,
): GeneratedFile[] => {
	if (options?.preserveWorkspaceDeps) return files;
	return files.map((file) => {
		if (
			!(
				file.filename.endsWith("/package.json") ||
				file.filename === "package.json"
			)
		) {
			return file;
		}
		try {
			const parsed = JSON.parse(file.content) as Record<string, unknown>;
			const changed = rewriteMorphdslDepsInPackage(parsed, MORPHDSL_VERSION);
			if (!changed) return file;
			return {
				...file,
				content: JSON.stringify(parsed, undefined, "\t") + "\n",
			};
		} catch {
			return file;
		}
	});
};

// Read this package's own version once at module load. Used to rewrite
// `workspace:*` for @morphdsl/* deps in generated package.json files.
// Falls back to "*" in environments without filesystem access (e.g. the
// playground's browser build) — those environments don't run the rewrite
// path because they don't write files.
const MORPHDSL_VERSION = ((): string => {
	try {
		return (
			JSON.parse(
				readFileSync(
					fileURLToPath(new URL("../package.json", import.meta.url)),
					"utf8",
				),
			) as { version: string }
		).version;
	} catch {
		return "*";
	}
})();

export const GenerateHandlerLive = Layer.succeed(GenerateHandler, {
	handle: (params, options) =>
		E.gen(function* () {
			const schema = yield* parseSchemaInput(params.schema);
			return yield* executeGenerate(schema, params.name, options);
		}),
});
